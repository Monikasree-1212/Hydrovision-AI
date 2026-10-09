import os
import sys
from datetime import datetime, timedelta

# Ensure backend path is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.base import engine, SessionLocal, Base
import app.database.models as models
from app.database.models import (
    User, UserRole, Dam, DamZone, Inspection, DroneImage, AIDetection, Defect,
    DefectSeverity, DefectStatus, MaintenanceWorkOrder, Alert, SupremeCommandDirective
)

def seed_comprehensive_dams():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        existing_count = db.query(Dam).count()
        print(f"Current dam count in database: {existing_count}")

        # Standard dam photo datasets
        photos_bhakra = [
            "https://images.unsplash.com/photo-1574482620826-40685ca5ebd2?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b3?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=80"
        ]
        photos_tehri = [
            "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80"
        ]
        photos_indira = [
            "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80"
        ]
        photos_hirakud = [
            "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=800&q=80",
            "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80"
        ]

        dams_data = [
            # --- MAJOR DAMS ---
            {
                "name": "Bhakra Dam",
                "code": "BHK-HP-01",
                "state": "Himachal Pradesh",
                "district": "Bilaspur",
                "dam_type": "Concrete Gravity",
                "dam_category": "MAJOR",
                "height_meters": 226.0,
                "length_meters": 518.0,
                "storage_capacity_mcm": 9340.0,
                "river_basin": "Sutlej River Basin",
                "commission_year": 1963,
                "latitude": 31.4116,
                "longitude": 76.4356,
                "location_label": "Bhakra Dam Reservoir Axis",
                "operator_name": "Bhakra Beas Management Board (BBMB)",
                "engineer_in_charge": "Er. Rajesh Kumar Sharma, Chief Dam Safety Engineer",
                "history_summary": "Bhakra Dam is a concrete gravity dam on the Sutlej River in Bilaspur, Himachal Pradesh. It forms the Gobind Sagar reservoir, one of India's largest hydro storage bodies. The dam has an installed hydro power capacity of 1,325 MW and serves critical irrigation across Punjab, Haryana, and Rajasthan. Operating under BBMB SOP #NDSA-BHK-2024 with automated piezometric monitoring and biannual spillway gate calibration.",
                "supreme_rating": 4.8,
                "rating_grade": "A+",
                "rating_comments": "Structural integrity optimal. Continuous telemetry feed verified.",
                "photos_json": photos_bhakra,
                "status": "OPERATIONAL"
            },
            {
                "name": "Tehri Dam",
                "code": "THR-UK-02",
                "state": "Uttarakhand",
                "district": "Tehri Garhwal",
                "dam_type": "Earth and Rockfill",
                "dam_category": "MAJOR",
                "height_meters": 260.5,
                "length_meters": 575.0,
                "storage_capacity_mcm": 3540.0,
                "river_basin": "Bhagirathi River Basin",
                "commission_year": 2006,
                "latitude": 30.3751,
                "longitude": 78.4852,
                "location_label": "Tehri Hydroelectric Complex",
                "operator_name": "THDC India Limited",
                "engineer_in_charge": "Er. Vikramaditya Singh, Senior Executive Engineer",
                "history_summary": "Tehri Dam is the tallest dam in India and 12th tallest in the world. It is a multi-purpose rock and earthfill embankment dam on the Bhagirathi River near Tehri, Uttarakhand. Generates 1,000 MW hydro power and provides drinking water to Delhi and Uttar Pradesh. Governed by THDC High-Altitude Rockfill Safety Protocols.",
                "supreme_rating": 4.7,
                "rating_grade": "A+",
                "rating_comments": "High-altitude seismic accelerometer network fully calibrated.",
                "photos_json": photos_tehri,
                "status": "OPERATIONAL"
            },
            {
                "name": "Indira Sagar Dam",
                "code": "IND-MP-03",
                "state": "Madhya Pradesh",
                "district": "Khandwa",
                "dam_type": "Concrete Gravity",
                "dam_category": "MAJOR",
                "height_meters": 92.0,
                "length_meters": 653.0,
                "storage_capacity_mcm": 12220.0,
                "river_basin": "Narmada River Basin",
                "commission_year": 2005,
                "latitude": 22.2847,
                "longitude": 76.4714,
                "location_label": "Narmada Riverbed Axis",
                "operator_name": "Narmada Hydroelectric Development Corp (NHDC)",
                "engineer_in_charge": "Er. Suresh Chandra Verma, Chief Project Engineer",
                "history_summary": "Indira Sagar Dam is the flagship multi-purpose project of Madhya Pradesh on the Narmada River at Narmadanagar, Khandwa. It holds the largest reservoir storage capacity in India (12.22 billion cubic meters) and feeds 1,000 MW of power generation alongside massive irrigation canals. SOP includes joint flood telemetry with Omkareshwar Dam.",
                "supreme_rating": 4.6,
                "rating_grade": "A",
                "rating_comments": "Radial crest gates operated with automated dispatch.",
                "photos_json": photos_indira,
                "status": "OPERATIONAL"
            },
            {
                "name": "Hirakud Dam",
                "code": "HRK-OD-04",
                "state": "Odisha",
                "district": "Sambalpur",
                "dam_type": "Composite Earth-Masonry",
                "dam_category": "MAJOR",
                "height_meters": 60.96,
                "length_meters": 4801.0,
                "storage_capacity_mcm": 5896.0,
                "river_basin": "Mahanadi River Basin",
                "commission_year": 1957,
                "latitude": 21.5234,
                "longitude": 83.8698,
                "location_label": "Mahanadi Sambalpur Reach",
                "operator_name": "Department of Water Resources, Odisha",
                "engineer_in_charge": "Er. Debabrata Patnaik, Chief Engineer Dam Safety",
                "history_summary": "Hirakud Dam is built across the Mahanadi River, about 15 kilometres from Sambalpur in Odisha. Behind the dam extends a lake 55 km long. It is one of the longest man-made earthen dams in the world (25.8 km total including dykes). Governed by Mahanadi Delta Flood Operations Manual.",
                "supreme_rating": 4.2,
                "rating_grade": "A",
                "rating_comments": "Siltation sonar survey completed for main reservoir.",
                "photos_json": photos_hirakud,
                "status": "OPERATIONAL"
            },
            {
                "name": "Idukki Arch Dam",
                "code": "IDK-KL-05",
                "state": "Kerala",
                "district": "Idukki",
                "dam_type": "Double Curvature Arch",
                "dam_category": "MAJOR",
                "height_meters": 168.9,
                "length_meters": 365.85,
                "storage_capacity_mcm": 1996.0,
                "river_basin": "Periyar River Basin",
                "commission_year": 1976,
                "latitude": 9.8497,
                "longitude": 76.9742,
                "location_label": "Kuravan & Kurathi Gorge",
                "operator_name": "Kerala State Electricity Board (KSEB)",
                "engineer_in_charge": "Er. K. Narayanan Nambiar, Chief Safety Engineer",
                "history_summary": "Idukki Dam is a double curvature arch dam constructed across the Periyar River in a gorge between two granite hills named Kuravan and Kurathi in Kerala. It stands 168.9 meters tall, supporting 780 MW hydro generation at Moolamattom underground power station. Monitored via micro-geodesic pendulum networks.",
                "supreme_rating": 4.9,
                "rating_grade": "A+",
                "rating_comments": "Double curvature arch monolith shows zero abnormal deflections.",
                "photos_json": photos_bhakra,
                "status": "OPERATIONAL"
            },
            {
                "name": "Sardar Sarovar Dam",
                "code": "SSD-GJ-06",
                "state": "Gujarat",
                "district": "Narmada",
                "dam_type": "Concrete Gravity",
                "dam_category": "MAJOR",
                "height_meters": 138.68,
                "length_meters": 1210.0,
                "storage_capacity_mcm": 9500.0,
                "river_basin": "Narmada River Basin",
                "commission_year": 2017,
                "latitude": 21.8315,
                "longitude": 73.7483,
                "location_label": "Kevadia Narmada Valley",
                "operator_name": "Sardar Sarovar Narmada Nigam Limited (SSNNL)",
                "engineer_in_charge": "Er. Mansukhbhai Patel, Chief Dam Director",
                "history_summary": "Sardar Sarovar Dam is a concrete gravity dam built on the Narmada river in Navagam, Gujarat. It supplies water to 4 states (Gujarat, MP, Maharashtra, Rajasthan) and powers 1,450 MW through River Bed and Canal Head Power Houses. SOP incorporates automated radial gate telemetry.",
                "supreme_rating": 4.7,
                "rating_grade": "A+",
                "rating_comments": "All 29 radial spillway gates tested and certified operational.",
                "photos_json": photos_indira,
                "status": "OPERATIONAL"
            },
            {
                "name": "Koyna Dam",
                "code": "KYN-MH-07",
                "state": "Maharashtra",
                "district": "Satara",
                "dam_type": "Rubble Concrete",
                "dam_category": "MAJOR",
                "height_meters": 103.2,
                "length_meters": 807.2,
                "storage_capacity_mcm": 2797.0,
                "river_basin": "Koyna River Basin",
                "commission_year": 1964,
                "latitude": 17.3986,
                "longitude": 73.7478,
                "location_label": "Koynanagar Western Ghats",
                "operator_name": "Maharashtra Water Resources Department (WRD)",
                "engineer_in_charge": "Er. Anant Shinde, Superintending Engineer",
                "history_summary": "Koyna Dam is one of the largest dams in Maharashtra, located in Koynanagar, Satara district. It generates 1,960 MW of hydroelectric power. Fitted with specialized seismic retrofitting after the 1967 Koyna earthquake.",
                "supreme_rating": 4.4,
                "rating_grade": "A",
                "rating_comments": "Seismic retrofitting monoliths structurally stable.",
                "photos_json": photos_tehri,
                "status": "OPERATIONAL"
            },
            {
                "name": "Nagarjuna Sagar Dam",
                "code": "NJS-TS-08",
                "state": "Telangana",
                "district": "Nalgonda",
                "dam_type": "Masonry Dam",
                "dam_category": "MAJOR",
                "height_meters": 124.0,
                "length_meters": 1550.0,
                "storage_capacity_mcm": 11472.0,
                "river_basin": "Krishna River Basin",
                "commission_year": 1967,
                "latitude": 16.5742,
                "longitude": 79.3125,
                "location_label": "Krishna River Border Reach",
                "operator_name": "Telangana & AP Joint Irrigation Board",
                "engineer_in_charge": "Er. V. Ramakrishna, Chief Engineer Dam Safety",
                "history_summary": "Nagarjuna Sagar Dam is a masonry dam across the Krishna River at Nagarjuna Sagar, spanning Nalgonda district of Telangana and Palnadu district of Andhra Pradesh. Holds 11.47 billion cubic meters of storage and feeds 816 MW power station.",
                "supreme_rating": 4.5,
                "rating_grade": "A",
                "rating_comments": "Crest gate hoist chain load testing verified.",
                "photos_json": photos_bhakra,
                "status": "OPERATIONAL"
            },
            {
                "name": "Mettur Dam (Stanley Reservoir)",
                "code": "MTR-TN-09",
                "state": "Tamil Nadu",
                "district": "Salem",
                "dam_type": "Concrete Masonry Gravity",
                "dam_category": "MAJOR",
                "height_meters": 65.0,
                "length_meters": 1700.0,
                "storage_capacity_mcm": 2708.0,
                "river_basin": "Kaveri River Basin",
                "commission_year": 1934,
                "latitude": 11.8011,
                "longitude": 77.8017,
                "location_label": "Kaveri Gorge Salem Reach",
                "operator_name": "Tamil Nadu Public Works Department (PWD)",
                "engineer_in_charge": "Er. S. Murugesan, Executive Engineer",
                "history_summary": "Mettur Dam is one of the oldest and largest dams in India built across the Kaveri River. Forms the Stanley Reservoir and serves as the lifeline for irrigation across the Kaveri delta region.",
                "supreme_rating": 4.3,
                "rating_grade": "A",
                "rating_comments": "Ellis surplus sluice gate vibration analysis within limits.",
                "photos_json": photos_hirakud,
                "status": "OPERATIONAL"
            },
            {
                "name": "Mullaperiyar Dam",
                "code": "MPD-KL-10",
                "state": "Kerala",
                "district": "Idukki",
                "dam_type": "Masonry Gravity",
                "dam_category": "MAJOR",
                "height_meters": 53.6,
                "length_meters": 365.7,
                "storage_capacity_mcm": 443.0,
                "river_basin": "Periyar River Basin",
                "commission_year": 1895,
                "latitude": 9.5283,
                "longitude": 77.1458,
                "location_label": "Thekkady Western Ghats Reach",
                "operator_name": "Supreme Court Supervisory Committee / TN PWD",
                "engineer_in_charge": "Er. K. Subramanian, Senior Monitoring Engineer",
                "history_summary": "Mullaperiyar Dam is a masonry gravity dam on the Periyar River in Kerala, operated by Tamil Nadu under a 999-year lease agreement. Subject to continuous joint monitoring by the Supreme Court appointed Supervisory Committee.",
                "supreme_rating": 3.8,
                "rating_grade": "B",
                "rating_comments": "Drainage gallery seepage monitored round-the-clock.",
                "photos_json": photos_bhakra,
                "status": "OPERATIONAL"
            },

            # --- MINOR & MEDIUM DAMS ---
            {
                "name": "Kosi Barrage & Hydro Structure",
                "code": "KSI-BR-11",
                "state": "Bihar",
                "district": "Supaul",
                "dam_type": "Medium Concrete Barrage",
                "dam_category": "MEDIUM",
                "height_meters": 12.0,
                "length_meters": 1150.0,
                "storage_capacity_mcm": 450.0,
                "river_basin": "Kosi River Basin",
                "commission_year": 1963,
                "latitude": 26.5167,
                "longitude": 86.9333,
                "location_label": "Kosi Birpur Border Axis",
                "operator_name": "Water Resources Department, Bihar",
                "engineer_in_charge": "Er. Alok Kumar Jha, Executive Engineer",
                "history_summary": "Kosi Barrage (Bhimnagar Barrage) is a flood control sluice structure across the Kosi river in Supaul district. Contains 56 gates regulating silt-heavy Himalayan discharges into Bihar and Nepal.",
                "supreme_rating": 4.1,
                "rating_grade": "B",
                "rating_comments": "Guide bund scour protection reinforced.",
                "photos_json": photos_hirakud,
                "status": "OPERATIONAL"
            },
            {
                "name": "Dhukwan Dam & Power House",
                "code": "DHK-UP-12",
                "state": "Uttar Pradesh",
                "district": "Jhansi",
                "dam_type": "Medium Masonry Dam",
                "dam_category": "MEDIUM",
                "height_meters": 15.5,
                "length_meters": 1180.0,
                "storage_capacity_mcm": 120.0,
                "river_basin": "Betwa River Basin",
                "commission_year": 1909,
                "latitude": 25.2058,
                "longitude": 78.5564,
                "location_label": "Betwa River Babina Reach",
                "operator_name": "UP Irrigation Department",
                "engineer_in_charge": "Er. Rameshwar Prasad, Assistant Engineer",
                "history_summary": "Dhukwan Dam is a historic masonry dam on the Betwa River near Babina in Jhansi district, Uttar Pradesh. Built in 1909 and equipped with a modernized 24 MW small hydro plant.",
                "supreme_rating": 4.2,
                "rating_grade": "A",
                "rating_comments": "Annual lime mortar compression test passed.",
                "photos_json": photos_indira,
                "status": "OPERATIONAL"
            },
            {
                "name": "Moraghat Minor Irrigation Dam",
                "code": "MRG-WB-13",
                "state": "West Bengal",
                "district": "Jalpaiguri",
                "dam_type": "Minor Earthen Dam",
                "dam_category": "MINOR",
                "height_meters": 14.0,
                "length_meters": 380.0,
                "storage_capacity_mcm": 45.0,
                "river_basin": "Teesta River Tributary Basin",
                "commission_year": 2011,
                "latitude": 26.6500,
                "longitude": 88.9200,
                "location_label": "Jalpaiguri Dooars Reach",
                "operator_name": "Minor Irrigation Directorate, West Bengal",
                "engineer_in_charge": "Er. Sourav Banerjee, District Irrigation Officer",
                "history_summary": "Moraghat Minor Irrigation Dam provides seasonal irrigation and flood moderation in the Dooars tea-garden region of Jalpaiguri. Features a low-head earthen embankment with masonry chute spillway.",
                "supreme_rating": 4.4,
                "rating_grade": "A",
                "rating_comments": "Embankment crest level survey verified normal.",
                "photos_json": photos_tehri,
                "status": "OPERATIONAL"
            },
            {
                "name": "Chandil Dam",
                "code": "CND-JH-14",
                "state": "Jharkhand",
                "district": "Seraikela Kharsawan",
                "dam_type": "Medium Earth/Masonry",
                "dam_category": "MEDIUM",
                "height_meters": 56.5,
                "length_meters": 720.0,
                "storage_capacity_mcm": 1963.0,
                "river_basin": "Subarnarekha River Basin",
                "commission_year": 1991,
                "latitude": 22.9633,
                "longitude": 86.0467,
                "location_label": "Subarnarekha Chandil Reach",
                "operator_name": "Subarnarekha Multipurpose Project (SMP)",
                "engineer_in_charge": "Er. Sanjay Topno, Superintending Engineer",
                "history_summary": "Chandil Dam is built across the Subarnarekha River in Jharkhand. Serves dual purposes of industrial water supply to Jamshedpur steel complex and irrigation.",
                "supreme_rating": 4.0,
                "rating_grade": "B",
                "rating_comments": "Radial winch motor gearboxes overhauled.",
                "photos_json": photos_indira,
                "status": "OPERATIONAL"
            },
            {
                "name": "Dantiwada Dam",
                "code": "DNT-GJ-15",
                "state": "Gujarat",
                "district": "Banaskantha",
                "dam_type": "Medium Masonry Dam",
                "dam_category": "MEDIUM",
                "height_meters": 61.0,
                "length_meters": 4832.0,
                "storage_capacity_mcm": 464.0,
                "river_basin": "Banas River Basin",
                "commission_year": 1965,
                "latitude": 24.3292,
                "longitude": 72.3333,
                "location_label": "Banas Arid Zone Basin",
                "operator_name": "Gujarat Water Resources Dev Corp",
                "engineer_in_charge": "Er. Hasmukhbhai Chaudhari, Executive Engineer",
                "history_summary": "Dantiwada Dam is a masonry and earthen dam across the Banas River in Banaskantha district. Critical for drought mitigation and underground aquifer recharge.",
                "supreme_rating": 4.3,
                "rating_grade": "A",
                "rating_comments": "Canal head regulator gate testing satisfactory.",
                "photos_json": photos_bhakra,
                "status": "OPERATIONAL"
            },
            {
                "name": "Barna Dam",
                "code": "BRN-MP-16",
                "state": "Madhya Pradesh",
                "district": "Raisen",
                "dam_type": "Medium Concrete Dam",
                "dam_category": "MEDIUM",
                "height_meters": 47.7,
                "length_meters": 432.0,
                "storage_capacity_mcm": 539.0,
                "river_basin": "Barna River Basin",
                "commission_year": 1978,
                "latitude": 23.0458,
                "longitude": 78.0625,
                "location_label": "Raisen Narmada Tributary",
                "operator_name": "MP Water Resources Department",
                "engineer_in_charge": "Er. Jitendra Singh Raghuvanshi, Dam Safety Engineer",
                "history_summary": "Barna Dam is a concrete dam constructed on the Barna River near Badi in Raisen district, MP. Feeds extensive canal networks in wheat-growing command areas.",
                "supreme_rating": 4.5,
                "rating_grade": "A",
                "rating_comments": "Spillway bucket lip energy dissipater verified intact.",
                "photos_json": photos_indira,
                "status": "OPERATIONAL"
            },
            {
                "name": "Ranganadi Dam",
                "code": "RNG-AR-17",
                "state": "Arunachal Pradesh",
                "district": "Lower Subansiri",
                "dam_type": "Medium Concrete Gravity",
                "dam_category": "MEDIUM",
                "height_meters": 68.0,
                "length_meters": 344.0,
                "storage_capacity_mcm": 21.2,
                "river_basin": "Ranganadi River Basin",
                "commission_year": 2002,
                "latitude": 27.3389,
                "longitude": 93.7667,
                "location_label": "Yazali Subansiri Reach",
                "operator_name": "North Eastern Electric Power Corp (NEEPCO)",
                "engineer_in_charge": "Er. Tashi Norbu, Senior Hydro Power Engineer",
                "history_summary": "Ranganadi Dam (Yazali) is a concrete gravity dam on the Ranganadi River in Arunachal Pradesh, powering 405 MW Stage-I Hydro Electric Project under NEEPCO.",
                "supreme_rating": 4.6,
                "rating_grade": "A",
                "rating_comments": "Desilting chamber flushing sequence completed.",
                "photos_json": photos_tehri,
                "status": "OPERATIONAL"
            },
            {
                "name": "Umiam River Dam",
                "code": "UMI-ML-18",
                "state": "Meghalaya",
                "district": "Ri-Bhoi",
                "dam_type": "Medium Arch-Gravity",
                "dam_category": "MEDIUM",
                "height_meters": 73.0,
                "length_meters": 171.0,
                "storage_capacity_mcm": 142.0,
                "river_basin": "Umiam River Basin",
                "commission_year": 1965,
                "latitude": 25.6533,
                "longitude": 91.9017,
                "location_label": "Barapani Shillong Plateau",
                "operator_name": "Meghalaya Energy Corp Ltd (MeECL)",
                "engineer_in_charge": "Er. Wanlamphang Lyngdoh, Executive Engineer",
                "history_summary": "Umiam Dam (Barapani Dam) is located 15 km north of Shillong in Meghalaya. It impounds the Umiam River to generate power for Meghalaya and Assam.",
                "supreme_rating": 4.2,
                "rating_grade": "A",
                "rating_comments": "Bridge deck expansion joints monitored.",
                "photos_json": photos_bhakra,
                "status": "OPERATIONAL"
            }
        ]

        # Insert Dams and Default Zones
        created_dams = []
        for d_info in dams_data:
            existing = db.query(Dam).filter(Dam.code == d_info["code"]).first()
            if not existing:
                dam_obj = Dam(
                    name=d_info["name"],
                    code=d_info["code"],
                    state=d_info["state"],
                    district=d_info["district"],
                    dam_type=d_info["dam_type"],
                    dam_category=d_info["dam_category"],
                    height_meters=d_info["height_meters"],
                    length_meters=d_info["length_meters"],
                    storage_capacity_mcm=d_info["storage_capacity_mcm"],
                    river_basin=d_info["river_basin"],
                    commission_year=d_info["commission_year"],
                    latitude=d_info["latitude"],
                    longitude=d_info["longitude"],
                    geometry=f"POINT({d_info['longitude']} {d_info['latitude']})",
                    location_label=d_info["location_label"],
                    operator_name=d_info["operator_name"],
                    engineer_in_charge=d_info["engineer_in_charge"],
                    history_summary=d_info["history_summary"],
                    supreme_rating=d_info["supreme_rating"],
                    rating_grade=d_info["rating_grade"],
                    rating_comments=d_info["rating_comments"],
                    photos_json=d_info["photos_json"],
                    status=d_info["status"]
                )
                db.add(dam_obj)
                db.commit()
                db.refresh(dam_obj)

                # Default zones for each dam
                zones = [
                    DamZone(dam_id=dam_obj.id, zone_name="Upstream Face", criticality="HIGH", description="Submerged and water-line concrete face"),
                    DamZone(dam_id=dam_obj.id, zone_name="Downstream Face", criticality="HIGH", description="Exposed concrete slope & drainage galleries"),
                    DamZone(dam_id=dam_obj.id, zone_name="Spillway & Crest Gates", criticality="CRITICAL", description="Radial discharge gates, piers & spillway chute"),
                    DamZone(dam_id=dam_obj.id, zone_name="Crest Roadway", criticality="MEDIUM", description="Top dam roadway & hoist gantry bridge"),
                    DamZone(dam_id=dam_obj.id, zone_name="Stilling Basin", criticality="HIGH", description="Energy dissipation stilling basin & training walls")
                ]
                db.add_all(zones)
                db.commit()
                created_dams.append(dam_obj)

        print(f"Successfully seeded {len(created_dams)} new dam records with GIS spatial metadata.")

        # Seed sample defects & inspections for key dams (Bhakra, Tehri, Indira Sagar)
        first_dam = db.query(Dam).filter(Dam.code == "BHK-HP-01").first()
        if first_dam:
            insp = db.query(Inspection).filter(Inspection.dam_id == first_dam.id).first()
            if not insp:
                insp = Inspection(
                    inspection_code="INSP-BHK-2026-001",
                    dam_id=first_dam.id,
                    inspection_type="DRONE_VISUAL",
                    inspection_date=datetime.utcnow() - timedelta(days=10),
                    status="COMPLETED",
                    coverage_percentage=98.5
                )
                db.add(insp)
                db.commit()
                db.refresh(insp)

                # Add sample GIS Defects for Bhakra Dam
                def1 = Defect(
                    defect_code="DEF-BHK-001",
                    dam_id=first_dam.id,
                    inspection_id=insp.id,
                    defect_type="CRACK",
                    severity=DefectSeverity.HIGH,
                    status=DefectStatus.VERIFIED,
                    confidence=0.94,
                    latitude=first_dam.latitude + 0.0012,
                    longitude=first_dam.longitude - 0.0008,
                    geometry=f"POINT({first_dam.longitude - 0.0008} {first_dam.latitude + 0.0012})",
                    coordinate_source="DRONE_GPS",
                    location_precision="HIGH_PRECISION",
                    coordinate_accuracy_meters=0.25,
                    engineer_comments="Upstream monolith joint hairline crack requiring epoxy injection sealing."
                )
                def2 = Defect(
                    defect_code="DEF-BHK-002",
                    dam_id=first_dam.id,
                    inspection_id=insp.id,
                    defect_type="SPALLING",
                    severity=DefectSeverity.MEDIUM,
                    status=DefectStatus.IN_REPAIR,
                    confidence=0.89,
                    latitude=first_dam.latitude - 0.0009,
                    longitude=first_dam.longitude + 0.0015,
                    geometry=f"POINT({first_dam.longitude + 0.0015} {first_dam.latitude - 0.0009})",
                    coordinate_source="MANUAL",
                    location_precision="MANUAL_GEOREFERENCE",
                    coordinate_accuracy_meters=0.5,
                    engineer_comments="Spillway pier #3 concrete cover spalling under repair."
                )
                db.add_all([def1, def2])
                db.commit()

                # Add Supreme Command Directive
                supreme_usr = db.query(User).filter(User.role == UserRole.SUPREME_COMMAND).first()
                directive = SupremeCommandDirective(
                    dam_id=first_dam.id,
                    directive_code="DIR-SC-2026-0001",
                    title="Mandatory Spillway Gate Ultrasonic Inspection",
                    command_text="Execute high-frequency ultrasonic stress test on radial spillway arm pinions within 72 hours under NDSA oversight.",
                    priority="URGENT",
                    status="ISSUED",
                    issued_by_id=supreme_usr.id if supreme_usr else None,
                    issued_at=datetime.utcnow() - timedelta(days=2)
                )
                db.add(directive)

                # Add Alert
                alert_obj = Alert(
                    dam_id=first_dam.id,
                    alert_title="Spillway Gate #4 Maintenance Advisory",
                    severity="HIGH",
                    created_at=datetime.utcnow() - timedelta(days=1)
                )
                db.add(alert_obj)
                db.commit()

        print("Sample GIS defect lineage, inspections, and directives verified.")

    finally:
        db.close()

if __name__ == "__main__":
    seed_comprehensive_dams()
