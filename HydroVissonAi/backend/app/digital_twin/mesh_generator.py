import struct
import json
import math
from typing import Dict, Any, List, Tuple

class ParametricDamMeshGenerator:
    """
    Parametric 3D GLTF 2.0 / GLB Binary Generator for HydroVision AI.
    Procedurally creates realistic 3D Dam digital twin assets for:
    - Concrete Gravity Dams
    - Concrete Arch Dams
    - Embankment / Earthfill Dams
    
    Includes Dam Body, Crest Road, Spillway Chutes & Piers, Water Reservoir Surface, and Terrain Abutments.
    """

    @staticmethod
    def generate_dam_glb(
        dam_type: str = "CONCRETE_GRAVITY",
        height_m: float = 80.0,
        length_m: float = 300.0,
        crest_width_m: float = 12.0,
        base_width_m: float = 65.0,
        spillway_count: int = 4,
        water_level_m: float = 70.0
    ) -> bytes:
        # Normalize parameters
        height_m = max(15.0, min(350.0, height_m))
        length_m = max(50.0, min(1500.0, length_m))
        crest_width_m = max(4.0, min(30.0, crest_width_m))
        base_width_m = max(crest_width_m + 10.0, min(250.0, base_width_m))
        water_level_m = max(5.0, min(height_m - 2.0, water_level_m))
        spillway_count = max(0, min(12, spillway_count))

        dam_type_upper = dam_type.upper() if dam_type else "CONCRETE_GRAVITY"

        vertices: List[float] = []
        indices: List[int] = []

        # Helper to add quad face (2 triangles)
        def add_quad(v0: int, v1: int, v2: int, v3: int):
            indices.extend([v0, v1, v2, v0, v2, v3])

        # Helper to add vertex
        def add_vertex(x: float, y: float, z: float):
            vertices.extend([round(x, 4), round(y, 4), round(z, 4)])
            return (len(vertices) // 3) - 1

        # -------------------------------------------------------------
        # 1. GENERATE DAM MESH GEOMETRY
        # -------------------------------------------------------------
        half_len = length_m / 2.0
        upstream_z = -crest_width_m / 2.0
        downstream_z = base_width_m - (crest_width_m / 2.0)

        if "ARCH" in dam_type_upper:
            # Curved Arch Dam Geometry
            segments = 24
            radius = length_m * 0.7
            arch_angle = math.pi / 3.0  # 60 degree arc
            
            # Bottom arch vertices & Top arch vertices
            for i in range(segments + 1):
                t = (i / segments) - 0.5
                angle = t * arch_angle
                
                # Top crest ring
                cx_top = radius * math.sin(angle)
                cz_top = -radius * (1.0 - math.cos(angle))
                add_vertex(cx_top, height_m, cz_top) # Top Upstream
                add_vertex(cx_top, height_m, cz_top + crest_width_m) # Top Downstream
                
                # Bottom base ring (thicker)
                cx_bot = (radius * 0.85) * math.sin(angle)
                cz_bot = -(radius * 0.85) * (1.0 - math.cos(angle))
                add_vertex(cx_bot, 0.0, cz_bot - (base_width_m * 0.2)) # Bottom Upstream
                add_vertex(cx_bot, 0.0, cz_bot + (base_width_m * 0.8)) # Bottom Downstream

            # Build quads connecting segments
            for i in range(segments):
                base_idx = i * 4
                n_base = (i + 1) * 4
                # Upstream face
                add_quad(base_idx, base_idx + 2, n_base + 2, n_base)
                # Downstream face
                add_quad(base_idx + 1, n_base + 1, n_base + 3, base_idx + 3)
                # Crest top
                add_quad(base_idx, n_base, n_base + 1, base_idx + 1)

        elif "EMBANKMENT" in dam_type_upper or "EARTH" in dam_type_upper:
            # Trapezoidal Earthfill Dam Geometry (Symmetrical sloped embankments)
            u_base_z = -base_width_m * 0.5
            d_base_z = base_width_m * 0.5
            u_crest_z = -crest_width_m * 0.5
            d_crest_z = crest_width_m * 0.5

            # 8 main vertices for embankment trapezoid
            v0 = add_vertex(-half_len, 0.0, u_base_z)
            v1 = add_vertex(half_len, 0.0, u_base_z)
            v2 = add_vertex(half_len, height_m, u_crest_z)
            v3 = add_vertex(-half_len, height_m, u_crest_z)
            v4 = add_vertex(-half_len, 0.0, d_base_z)
            v5 = add_vertex(half_len, 0.0, d_base_z)
            v6 = add_vertex(half_len, height_m, d_crest_z)
            v7 = add_vertex(-half_len, height_m, d_crest_z)

            # Faces
            add_quad(v0, v1, v2, v3) # Upstream Slope
            add_quad(v4, v7, v6, v5) # Downstream Slope
            add_quad(v3, v2, v6, v7) # Crest Top
            add_quad(v0, v3, v7, v4) # Left Abutment
            add_quad(v1, v5, v6, v2) # Right Abutment

        else:
            # Default: Concrete Gravity Dam Geometry (Vertical Upstream, Sloped Downstream)
            v0 = add_vertex(-half_len, 0.0, upstream_z)
            v1 = add_vertex(half_len, 0.0, upstream_z)
            v2 = add_vertex(half_len, height_m, upstream_z)
            v3 = add_vertex(-half_len, height_m, upstream_z)

            v4 = add_vertex(-half_len, 0.0, downstream_z)
            v5 = add_vertex(half_len, 0.0, downstream_z)
            v6 = add_vertex(half_len, height_m, upstream_z + crest_width_m)
            v7 = add_vertex(-half_len, height_m, upstream_z + crest_width_m)

            add_quad(v0, v1, v2, v3) # Upstream Face (Vertical)
            add_quad(v4, v7, v6, v5) # Downstream Face (Sloped)
            add_quad(v3, v2, v6, v7) # Crest Road Top
            add_quad(v0, v3, v7, v4) # Left Abutment Side
            add_quad(v1, v5, v6, v2) # Right Abutment Side

        # -------------------------------------------------------------
        # 2. SPILLWAY PIERS & GATES (if spillway_count > 0)
        # -------------------------------------------------------------
        if spillway_count > 0:
            spillway_width = min(length_m * 0.4, spillway_count * 10.0)
            pier_width = 2.5
            bay_width = (spillway_width - (spillway_count + 1) * pier_width) / max(1, spillway_count)
            start_x = -spillway_width / 2.0

            for p in range(spillway_count + 1):
                px = start_x + p * (bay_width + pier_width)
                pier_h = height_m + 6.0
                pz_start = upstream_z - 2.0
                pz_end = upstream_z + crest_width_m + 4.0

                p0 = add_vertex(px, height_m, pz_start)
                p1 = add_vertex(px + pier_width, height_m, pz_start)
                p2 = add_vertex(px + pier_width, pier_h, pz_start)
                p3 = add_vertex(px, pier_h, pz_start)

                p4 = add_vertex(px, height_m, pz_end)
                p5 = add_vertex(px + pier_width, height_m, pz_end)
                p6 = add_vertex(px + pier_width, pier_h, pz_end)
                p7 = add_vertex(px, pier_h, pz_end)

                add_quad(p0, p1, p2, p3) # Front
                add_quad(p4, p7, p6, p5) # Back
                add_quad(p3, p2, p6, p7) # Top Pier Deck
                add_quad(p0, p3, p7, p4) # Left
                add_quad(p1, p5, p6, p2) # Right

        # -------------------------------------------------------------
        # 3. WATER RESERVOIR PLANE
        # -------------------------------------------------------------
        res_len = length_m * 1.3
        res_depth = length_m * 0.8
        w_y = water_level_m
        w_z_start = upstream_z
        w_z_end = upstream_z - res_depth

        w0 = add_vertex(-res_len / 2.0, w_y, w_z_start)
        w1 = add_vertex(res_len / 2.0, w_y, w_z_start)
        w2 = add_vertex(res_len / 2.0, w_y, w_z_end)
        w3 = add_vertex(-res_len / 2.0, w_y, w_z_end)

        add_quad(w0, w1, w2, w3) # Water Reservoir Surface

        # -------------------------------------------------------------
        # 4. COMPUTE VERTEX NORMALS & PACK BINARY GLTF DATA
        # -------------------------------------------------------------
        num_vertices = len(vertices) // 3
        num_indices = len(indices)

        normals: List[float] = [0.0] * len(vertices)
        for i in range(0, len(indices), 3):
            i0, i1, i2 = indices[i], indices[i+1], indices[i+2]
            p0 = (vertices[i0*3], vertices[i0*3+1], vertices[i0*3+2])
            p1 = (vertices[i1*3], vertices[i1*3+1], vertices[i1*3+2])
            p2 = (vertices[i2*3], vertices[i2*3+1], vertices[i2*3+2])

            ux, uy, uz = p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]
            vx, vy, vz = p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]

            nx = uy * vz - uz * vy
            ny = uz * vx - ux * vz
            nz = ux * vy - uy * vx

            length = math.sqrt(nx*nx + ny*ny + nz*nz)
            if length > 1e-6:
                nx, ny, nz = nx / length, ny / length, nz / length

            normals[i0*3] += nx; normals[i0*3+1] += ny; normals[i0*3+2] += nz
            normals[i1*3] += nx; normals[i1*3+1] += ny; normals[i1*3+2] += nz
            normals[i2*3] += nx; normals[i2*3+1] += ny; normals[i2*3+2] += nz

        for i in range(0, len(normals), 3):
            nx, ny, nz = normals[i], normals[i+1], normals[i+2]
            length = math.sqrt(nx*nx + ny*ny + nz*nz)
            if length > 1e-6:
                normals[i] = round(nx / length, 4)
                normals[i+1] = round(ny / length, 4)
                normals[i+2] = round(nz / length, 4)
            else:
                normals[i+1] = 1.0

        # Min/Max bounding box calculations
        xs = [vertices[i] for i in range(0, len(vertices), 3)]
        ys = [vertices[i + 1] for i in range(0, len(vertices), 3)]
        zs = [vertices[i + 2] for i in range(0, len(vertices), 3)]

        min_pos = [min(xs), min(ys), min(zs)]
        max_pos = [max(xs), max(ys), max(zs)]

        n_xs = [normals[i] for i in range(0, len(normals), 3)]
        n_ys = [normals[i + 1] for i in range(0, len(normals), 3)]
        n_zs = [normals[i + 2] for i in range(0, len(normals), 3)]
        min_norm = [min(n_xs), min(n_ys), min(n_zs)]
        max_norm = [max(n_xs), max(n_ys), max(n_zs)]

        min_idx = min(indices)
        max_idx = max(indices)

        bin_vertices = struct.pack(f'<{len(vertices)}f', *vertices)
        bin_normals = struct.pack(f'<{len(normals)}f', *normals)
        bin_indices = struct.pack(f'<{len(indices)}H', *indices)

        vert_byte_len = len(bin_vertices)
        norm_byte_len = len(bin_normals)
        idx_byte_len = len(bin_indices)

        bin_bytes = bin_vertices + bin_normals + bin_indices
        bin_padding = (4 - (len(bin_bytes) % 4)) % 4
        bin_bytes += b'\x00' * bin_padding
        total_bin_len = len(bin_bytes)

        gltf_json = {
            "asset": {
                "version": "2.0",
                "generator": f"HydroVision AI Parametric Dam Generator ({dam_type})"
            },
            "scene": 0,
            "scenes": [
                {
                    "name": "Dam Scene",
                    "nodes": [0]
                }
            ],
            "nodes": [
                {
                    "name": f"Dam Structure ({dam_type})",
                    "mesh": 0
                }
            ],
            "meshes": [
                {
                    "name": "Dam Parametric Mesh",
                    "primitives": [
                        {
                            "attributes": {
                                "POSITION": 0,
                                "NORMAL": 1
                            },
                            "indices": 2,
                            "material": 0
                        }
                    ]
                }
            ],
            "materials": [
                {
                    "name": "Concrete Dam Surface Material",
                    "pbrMetallicRoughness": {
                        "baseColorFactor": [0.6, 0.65, 0.7, 1.0],
                        "metallicFactor": 0.05,
                        "roughnessFactor": 0.75
                    }
                }
            ],
            "buffers": [
                {
                    "byteLength": total_bin_len
                }
            ],
            "bufferViews": [
                {
                    "buffer": 0,
                    "byteOffset": 0,
                    "byteLength": vert_byte_len,
                    "target": 34962 # ARRAY_BUFFER (POSITION)
                },
                {
                    "buffer": 0,
                    "byteOffset": vert_byte_len,
                    "byteLength": norm_byte_len,
                    "target": 34962 # ARRAY_BUFFER (NORMAL)
                },
                {
                    "buffer": 0,
                    "byteOffset": vert_byte_len + norm_byte_len,
                    "byteLength": idx_byte_len,
                    "target": 34963 # ELEMENT_ARRAY_BUFFER (INDEX)
                }
            ],
            "accessors": [
                {
                    "bufferView": 0,
                    "byteOffset": 0,
                    "componentType": 5126, # FLOAT
                    "count": num_vertices,
                    "type": "VEC3",
                    "max": max_pos,
                    "min": min_pos
                },
                {
                    "bufferView": 1,
                    "byteOffset": 0,
                    "componentType": 5126, # FLOAT
                    "count": num_vertices,
                    "type": "VEC3",
                    "max": max_norm,
                    "min": min_norm
                },
                {
                    "bufferView": 2,
                    "byteOffset": 0,
                    "componentType": 5123, # UNSIGNED_SHORT
                    "count": num_indices,
                    "type": "SCALAR",
                    "max": [max_idx],
                    "min": [min_idx]
                }
            ]
        }

        json_bytes = json.dumps(gltf_json, separators=(',', ':')).encode('utf-8')
        json_padding = (4 - (len(json_bytes) % 4)) % 4
        json_bytes += b' ' * json_padding

        json_chunk_header = struct.pack('<II', len(json_bytes), 0x4E4F534A) # JSON
        bin_chunk_header = struct.pack('<II', len(bin_bytes), 0x00415444)  # BIN

        total_length = 12 + 8 + len(json_bytes) + 8 + len(bin_bytes)
        header = struct.pack('<III', 0x46544C67, 2, total_length)

        return header + json_chunk_header + json_bytes + bin_chunk_header + bin_bytes


