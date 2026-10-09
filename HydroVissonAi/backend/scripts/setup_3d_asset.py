import os
import struct
import json

def create_valid_sample_glb(output_path: str):
    """
    Generates a syntactically valid binary GLTF 2.0 (.glb) file containing a 
    standard sample mesh asset for 3D Digital Twin visualization.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # 1. Basic GLTF JSON structure
    gltf_json = {
        "asset": {
            "version": "2.0",
            "generator": "HydroVision AI 3D Asset Generator"
        },
        "scene": 0,
        "scenes": [
            {
                "name": "Dam Sample Scene",
                "nodes": [0]
            }
        ],
        "nodes": [
            {
                "name": "Standard Dam Engineering Sample",
                "mesh": 0
            }
        ],
        "meshes": [
            {
                "name": "Dam Structure Mesh",
                "primitives": [
                    {
                        "attributes": {
                            "POSITION": 0
                        },
                        "indices": 1,
                        "material": 0
                    }
                ]
            }
        ],
        "materials": [
            {
                "name": "Concrete Surface Material",
                "pbrMetallicRoughness": {
                    "baseColorFactor": [0.6, 0.65, 0.7, 1.0],
                    "metallicFactor": 0.1,
                    "roughnessFactor": 0.8
                }
            }
        ],
        "buffers": [
            {
                "byteLength": 132
            }
        ],
        "bufferViews": [
            {
                "buffer": 0,
                "byteOffset": 0,
                "byteLength": 96,
                "target": 34962 # ARRAY_BUFFER
            },
            {
                "buffer": 0,
                "byteOffset": 96,
                "byteLength": 36,
                "target": 34963 # ELEMENT_ARRAY_BUFFER
            }
        ],
        "accessors": [
            {
                "bufferView": 0,
                "byteOffset": 0,
                "componentType": 5126, # FLOAT
                "count": 8,
                "type": "VEC3",
                "max": [5.0, 4.0, 10.0],
                "min": [-5.0, 0.0, -10.0]
            },
            {
                "bufferView": 1,
                "byteOffset": 0,
                "componentType": 5123, # UNSIGNED_SHORT
                "count": 18,
                "type": "SCALAR",
                "max": [7],
                "min": [0]
            }
        ]
    }
    
    json_bytes = json.dumps(gltf_json, separators=(',', ':')).encode('utf-8')
    # Pad JSON chunk to 4-byte boundary
    json_padding = (4 - (len(json_bytes) % 4)) % 4
    json_bytes += b' ' * json_padding
    
    # 2. Binary buffer data (8 vertices * 3 floats * 4 bytes = 96 bytes)
    vertices = [
        -5.0, 0.0, -10.0,
         5.0, 0.0, -10.0,
         5.0, 4.0, -10.0,
        -5.0, 4.0, -10.0,
        -3.0, 0.0,  10.0,
         3.0, 0.0,  10.0,
         3.0, 4.0,  10.0,
        -3.0, 4.0,  10.0
    ]
    bin_vertices = struct.pack(f'<{len(vertices)}f', *vertices)
    
    # 18 indices * unsigned short (2 bytes) = 36 bytes
    indices = [
        0, 1, 2,  0, 2, 3, # Front face
        4, 6, 5,  4, 7, 6, # Back face
        0, 4, 5,  0, 5, 1  # Base face
    ]
    bin_indices = struct.pack(f'<{len(indices)}H', *indices)
    
    bin_bytes = bin_vertices + bin_indices
    # Pad binary chunk to 4-byte boundary
    bin_padding = (4 - (len(bin_bytes) % 4)) % 4
    bin_bytes += b'\x00' * bin_padding
    
    # 3. Construct GLB Header & Chunks
    # Header: Magic (0x46544C67), Version (2), Total Length
    json_chunk_header = struct.pack('<II', len(json_bytes), 0x4E4F534A) # JSON chunk
    bin_chunk_header = struct.pack('<II', len(bin_bytes), 0x00415444)  # BIN chunk
    
    total_length = 12 + 8 + len(json_bytes) + 8 + len(bin_bytes)
    header = struct.pack('<III', 0x46544C67, 2, total_length)
    
    glb_content = header + json_chunk_header + json_bytes + bin_chunk_header + bin_bytes
    
    with open(output_path, 'wb') as f:
        f.write(glb_content)
        
    print(f"[OK] Valid 3D GLB model file created at: {output_path} ({len(glb_content)} bytes)")

def setup_all_3d_assets():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(script_dir)
    frontend_dir = os.path.abspath(os.path.join(backend_dir, "..", "frontend"))
    
    backend_glb = os.path.join(backend_dir, "uploads", "3d_models", "standard_dam_sample.glb")
    frontend_glb = os.path.join(frontend_dir, "public", "models", "standard_dam_sample.glb")
    
    create_valid_sample_glb(backend_glb)
    create_valid_sample_glb(frontend_glb)

if __name__ == "__main__":
    setup_all_3d_assets()

