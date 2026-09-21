# generate_slimes.py - Procedural 3D Generator for Axie Infinity Slime Chimera Family
# Generates native .blend files and optimized .glb models with Hand-Painted PBR Textures and Rigged Animations

import bpy
import math
import os
import array

def clean_scene():
    """Wipe default objects from scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.meshes: bpy.data.meshes.remove(block)
    for block in bpy.data.materials: bpy.data.materials.remove(block)
    for block in bpy.data.textures: bpy.data.textures.remove(block)
    for block in bpy.data.images: bpy.data.images.remove(block)
    for block in bpy.data.armatures: bpy.data.armatures.remove(block)
    for block in bpy.data.actions: bpy.data.actions.remove(block)

def create_slime_texture(variant='basic'):
    """
    Generates a 1024x1024 hand-painted style PBR BaseColor texture atlas matching slime.png and slime-attack.png.
    Region 1: Body (U: 0.0 - 0.75, V: 0.0 - 1.0)
    Region 2: Eye Sclera & Pupil (U: 0.75 - 1.0, V: 0.5 - 1.0)
    Region 3: Beak / Accents (U: 0.75 - 1.0, V: 0.0 - 0.5)
    """
    width, height = 1024, 1024
    img = bpy.data.images.new(f"tex_slime_{variant}", width=width, height=height, alpha=True)
    pixels = array.array('f', [0.0] * (width * height * 4))

    for y in range(height):
        v = y / height
        for x in range(width):
            u = x / width
            idx = (y * width + x) * 4

            if u < 0.75:
                # --- REGION 1: SLIME BODY ---
                # Normalized coords within body UV region
                bu = u / 0.75  # 0 to 1 around circumference (0.5 is front center)
                bv = v         # 0 to 1 vertical height (0 is bottom, 1 is tip)

                # Base vibrant lime green
                # Bottom: deeper olive (#4d7c0f -> 0.30, 0.49, 0.06)
                # Middle: bright lime (#8ed420 -> 0.56, 0.83, 0.13)
                # Top: sunny pastel (#d9f99d -> 0.85, 0.98, 0.62)
                if bv < 0.35:
                    t = bv / 0.35
                    r = 0.30 + (0.56 - 0.30) * t
                    g = 0.49 + (0.83 - 0.49) * t
                    b = 0.06 + (0.13 - 0.06) * t
                else:
                    t = (bv - 0.35) / 0.65
                    r = 0.56 + (0.85 - 0.56) * (t ** 0.8)
                    g = 0.83 + (0.98 - 0.83) * (t ** 0.8)
                    b = 0.13 + (0.62 - 0.13) * (t ** 0.8)

                # Soft directional lighting (front is lighter)
                front_dist = abs(bu - 0.5)
                if front_dist < 0.3:
                    front_highlight = (1.0 - front_dist / 0.3) * 0.08
                    r = min(1.0, r + front_highlight)
                    g = min(1.0, g + front_highlight)
                    b = min(1.0, b + front_highlight * 0.8)

                # Specular sheen on lower-right cheek (bu ~ 0.62, bv ~ 0.28)
                spec_dist = math.sqrt(((bu - 0.62) * 1.5) ** 2 + ((bv - 0.28) * 1.5) ** 2)
                if spec_dist < 0.045:
                    intensity = (1.0 - spec_dist / 0.045) ** 2
                    r = min(1.0, r * (1.0 - intensity) + 1.0 * intensity)
                    g = min(1.0, g * (1.0 - intensity) + 1.0 * intensity)
                    b = min(1.0, b * (1.0 - intensity) + 0.95 * intensity)

                if variant == 'attack':
                    # Rosy pink cheek blush on left (bu ~ 0.38, bv ~ 0.46) and right (bu ~ 0.62, bv ~ 0.46)
                    d_left = math.sqrt(((bu - 0.38) * 1.2) ** 2 + ((bv - 0.46) * 1.6) ** 2)
                    d_right = math.sqrt(((bu - 0.62) * 1.2) ** 2 + ((bv - 0.46) * 1.6) ** 2)
                    blush_d = min(d_left, d_right)
                    if blush_d < 0.09:
                        blush_int = (1.0 - blush_d / 0.09) * 0.65
                        # Coral pink: (0.98, 0.44, 0.52)
                        r = r * (1.0 - blush_int) + 0.98 * blush_int
                        g = g * (1.0 - blush_int) + 0.44 * blush_int
                        b = b * (1.0 - blush_int) + 0.52 * blush_int

                elif variant == 'basic':
                    # Grumpy downturned wavy mouth on front center (bu ~ 0.50, bv ~ 0.42 to 0.46)
                    mouth_x = (bu - 0.50) / 0.16  # -1 to 1 across mouth width
                    if -1.0 <= mouth_x <= 1.0:
                        # Wavy downturned curve: y_center = 0.44 - (1 - mouth_x^2) * 0.03
                        mouth_target_v = 0.44 - (1.0 - mouth_x ** 2) * 0.025
                        mouth_dist = abs(bv - mouth_target_v)
                        if mouth_dist < 0.012:
                            # Dark olive lip line
                            line_int = 1.0 - (mouth_dist / 0.012)
                            r = r * (1.0 - line_int) + 0.22 * line_int
                            g = g * (1.0 - line_int) + 0.35 * line_int
                            b = b * (1.0 - line_int) + 0.08 * line_int

                pixels[idx] = r
                pixels[idx + 1] = g
                pixels[idx + 2] = b
                pixels[idx + 3] = 1.0

            elif v >= 0.5:
                # --- REGION 2: EYE SCLERA & PUPIL ---
                eu = (u - 0.75) / 0.25  # 0 to 1
                ev = (v - 0.5) / 0.5    # 0 to 1
                cx, cy = 0.5, 0.5
                edist = math.sqrt((eu - cx) ** 2 + (ev - cy) ** 2)

                if edist > 0.46:
                    # Dark outer border
                    r, g, b = 0.20, 0.12, 0.04
                elif edist > 0.42:
                    # Inner border shadow
                    r, g, b = 0.45, 0.22, 0.06
                else:
                    # Golden yellow / amber iris
                    t = edist / 0.42
                    r = 0.98 + (0.95 - 0.98) * t
                    g = 0.76 + (0.55 - 0.76) * t
                    b = 0.12 + (0.05 - 0.12) * t

                    # Horizontal oval pupil: dark chocolate umber
                    p_dist = math.sqrt(((eu - cx) * 0.8) ** 2 + ((ev - cy) * 2.6) ** 2)
                    if p_dist < 0.16:
                        p_int = min(1.0, (0.16 - p_dist) / 0.04)
                        r = r * (1.0 - p_int) + 0.28 * p_int
                        g = g * (1.0 - p_int) + 0.10 * p_int
                        b = b * (1.0 - p_int) + 0.02 * p_int

                    # Specular eye shine dot (upper left)
                    s_dist = math.sqrt((eu - 0.38) ** 2 + (ev - 0.65) ** 2)
                    if s_dist < 0.065:
                        s_int = min(1.0, (0.065 - s_dist) / 0.02)
                        r = r * (1.0 - s_int) + 1.0 * s_int
                        g = g * (1.0 - s_int) + 1.0 * s_int
                        b = b * (1.0 - s_int) + 0.98 * s_int

                pixels[idx] = r
                pixels[idx + 1] = g
                pixels[idx + 2] = b
                pixels[idx + 3] = 1.0

            else:
                # --- REGION 3: BEAK / ACCENTS ---
                bu_beak = (u - 0.75) / 0.25
                bv_beak = v / 0.5
                # Warm orange bird beak gradient with terracotta rim
                r = 0.97 - bv_beak * 0.18
                g = 0.46 - bv_beak * 0.14
                b = 0.08 - bv_beak * 0.04
                pixels[idx] = r
                pixels[idx + 1] = g
                pixels[idx + 2] = b
                pixels[idx + 3] = 1.0

    img.pixels.foreach_set(pixels)
    img.pack()
    return img

def create_slime_material(img, name="Mat_Slime"):
    """Creates stylized PBR material using Principled BSDF linked to BaseColor texture"""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    bsdf = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Roughness'].default_value = 0.32  # Gelatinous shine
    bsdf.inputs['Metallic'].default_value = 0.02

    tex_node = nodes.new(type='ShaderNodeTexImage')
    tex_node.image = img
    tex_node.interpolation = 'Linear'

    links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
    return mat

def build_teardrop_body_mesh(name="Slime_Body"):
    """
    Constructs the teardrop dumpling body with flat base and pinched crest tip.
    UV mapped to U: [0.0, 0.75], V: [0.0, 1.0]
    """
    segments = 28
    rings = 20
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=0.6, location=(0, 0, 0))
    obj = bpy.context.active_object
    obj.name = name

    mesh = obj.data
    for v in mesh.vertices:
        # Normalize original height from -0.6 to +0.6 -> 0.0 to 1.0
        h = (v.co.z + 0.6) / 1.2

        # 1. Height shaping (ground at 0.0, top tip at 1.18)
        h = max(0.0, min(1.0, (v.co.z + 0.6) / 1.2))
        new_z = (h ** 1.08) * 1.18

        # 2. Radial teardrop profile
        # Wide at lower third (h ~ 0.35), flat bottom, pinched cone tip at h = 1.0
        if h < 0.12:
            # Flatten bottom slightly for stable grounding
            rad_mult = 0.75 + (h / 0.12) * 0.35
            new_z = max(0.015, new_z)
        elif h <= 0.40:
            t = max(0.0, min(1.0, (h - 0.12) / 0.28))
            rad_mult = 1.10 + math.sin(t * math.pi * 0.5) * 0.18
        else:
            t = max(0.0, min(1.0, (h - 0.40) / 0.60))
            rad_mult = 1.28 * ((1.0 - t) ** 0.82)
            rad_mult = max(0.02, float(rad_mult))

        # 3. Slight oval cross-section (wider laterally, exactly like in sprite)
        new_x = v.co.x * rad_mult * 1.14
        new_y = v.co.y * rad_mult * 1.02

        # 4. Backward organic curve of the pinched tip
        if h > 0.75:
            tip_curve = ((h - 0.75) / 0.25) ** 2 * 0.10
            new_y += tip_curve

        v.co.x = new_x
        v.co.y = new_y
        v.co.z = new_z

    # Recompute normals and shade smooth
    mesh.update()
    bpy.ops.object.shade_smooth()

    # Remap UVs to Region 1 (U: 0.0 - 0.75, V: 0.0 - 1.0)
    uv_layer = mesh.uv_layers.active.data
    for poly in mesh.polygons:
        for loop_idx in poly.loop_indices:
            orig_uv = uv_layer[loop_idx].uv
            # Scale U to [0.0, 0.75]
            uv_layer[loop_idx].uv = (orig_uv.x * 0.75, orig_uv.y)

    return obj

def build_eye_mesh(name="Eye", is_left=True):
    """
    Creates eye mesh placed on the lateral front cheek of the slime.
    UVs mapped to Region 2 (U: 0.75 - 1.0, V: 0.5 - 1.0)
    """
    bpy.ops.mesh.primitive_uv_sphere_add(segments=18, ring_count=14, radius=0.19, location=(0, 0, 0))
    eye = bpy.context.active_object
    eye.name = name

    # Flatten eye slightly into expressive convex disc
    eye.scale = (1.05, 0.42, 1.10)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.shade_smooth()

    # Position on front-lateral cheek
    sign = 1.0 if is_left else -1.0
    eye.location = (sign * 0.46, -0.48, 0.54)
    eye.rotation_euler = (math.radians(-6), math.radians(sign * 18), math.radians(-sign * 30))
    bpy.ops.object.transform_apply(location=True, rotation=True)

    # Remap UVs to Region 2 (U: 0.75 - 1.0, V: 0.5 - 1.0)
    uv_layer = eye.data.uv_layers.active.data
    for poly in eye.data.polygons:
        for loop_idx in poly.loop_indices:
            orig_uv = uv_layer[loop_idx].uv
            nu = 0.75 + orig_uv.x * 0.25
            nv = 0.50 + orig_uv.y * 0.50
            uv_layer[loop_idx].uv = (nu, nv)

    return eye

def build_beak_mesh(name="Slime_Beak"):
    """
    Creates curved parrot-like bird beak for slime-attack protruding cleanly from front face.
    UVs mapped to Region 3 (U: 0.75 - 1.0, V: 0.0 - 0.5)
    """
    # Upper hooked beak
    bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=0.24, depth=0.48, location=(0, 0, 0))
    upper = bpy.context.active_object
    upper.name = "Beak_Upper"

    for v in upper.data.vertices:
        # Hook downward towards tip
        if v.co.z > 0:
            t = max(0.0, min(1.0, v.co.z / 0.24))
            v.co.y -= (t ** 1.7) * 0.18
            v.co.z -= (t ** 1.7) * 0.09

    upper.rotation_euler = (math.radians(95), 0, 0)
    upper.location = (0, -0.74, 0.52)
    upper.scale = (1.05, 1.22, 1.05)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.shade_smooth()

    # Lower mandible
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.16, depth=0.26, location=(0, 0, 0))
    lower = bpy.context.active_object
    lower.name = "Beak_Lower"
    lower.rotation_euler = (math.radians(72), 0, 0)
    lower.location = (0, -0.70, 0.40)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.shade_smooth()

    # Join upper and lower beak
    upper.select_set(True)
    lower.select_set(True)
    bpy.context.view_layer.objects.active = upper
    bpy.ops.object.join()
    beak = upper
    beak.name = name

    # Remap UVs to Region 3 (U: 0.75 - 1.0, V: 0.0 - 0.5)
    uv_layer = beak.data.uv_layers.active.data
    for poly in beak.data.polygons:
        for loop_idx in poly.loop_indices:
            orig_uv = uv_layer[loop_idx].uv
            nu = 0.75 + orig_uv.x * 0.25
            nv = 0.00 + orig_uv.y * 0.50
            uv_layer[loop_idx].uv = (nu, nv)

    return beak

def build_slime_armature_and_rig(mesh_obj, has_beak=False):
    """
    Builds clean skeletal rig for organic gelatinous squash & stretch.
    Bones: Root -> Body -> Belly -> Tip, plus Eye.L, Eye.R (and Beak if present).
    Assigns vertex weights cleanly by anatomical regions.
    """
    arm_data = bpy.data.armatures.new("Armature_Slime")
    arm_obj = bpy.data.objects.new("Armature", arm_data)
    bpy.context.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj

    bpy.ops.object.mode_set(mode='EDIT')
    edit_bones = arm_data.edit_bones

    # 1. Root bone on ground
    b_root = edit_bones.new("root")
    b_root.head = (0, 0, 0)
    b_root.tail = (0, 0, 0.18)

    # 2. Body base
    b_body = edit_bones.new("body")
    b_body.head = (0, 0, 0.18)
    b_body.tail = (0, 0, 0.52)
    b_body.parent = b_root

    # 3. Belly (Main squash & stretch controller)
    b_belly = edit_bones.new("belly")
    b_belly.head = (0, 0, 0.52)
    b_belly.tail = (0, 0, 0.88)
    b_belly.parent = b_body

    # 4. Tip (Elastic crest)
    b_tip = edit_bones.new("tip")
    b_tip.head = (0, 0, 0.88)
    b_tip.tail = (0, 0.06, 1.18)
    b_tip.parent = b_belly

    # 5. Eyes
    b_eye_l = edit_bones.new("eye_L")
    b_eye_l.head = (0.46, -0.48, 0.54)
    b_eye_l.tail = (0.54, -0.56, 0.54)
    b_eye_l.parent = b_belly

    b_eye_r = edit_bones.new("eye_R")
    b_eye_r.head = (-0.46, -0.48, 0.54)
    b_eye_r.tail = (-0.54, -0.56, 0.54)
    b_eye_r.parent = b_belly

    if has_beak:
        b_beak = edit_bones.new("beak")
        b_beak.head = (0, -0.66, 0.50)
        b_beak.tail = (0, -0.92, 0.46)
        b_beak.parent = b_belly

    bpy.ops.object.mode_set(mode='OBJECT')

    # Parent mesh to armature
    mesh_obj.select_set(True)
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.parent_set(type='ARMATURE')

    # Assign Vertex Groups with smooth distance falloff
    vgroups = {
        'root': mesh_obj.vertex_groups.new(name='root'),
        'body': mesh_obj.vertex_groups.new(name='body'),
        'belly': mesh_obj.vertex_groups.new(name='belly'),
        'tip': mesh_obj.vertex_groups.new(name='tip'),
        'eye_L': mesh_obj.vertex_groups.new(name='eye_L'),
        'eye_R': mesh_obj.vertex_groups.new(name='eye_R')
    }
    if has_beak:
        vgroups['beak'] = mesh_obj.vertex_groups.new(name='beak')

    for v in mesh_obj.data.vertices:
        x, y, z = v.co.x, v.co.y, v.co.z

        # Check if vertex belongs to Eyes
        d_eye_l = math.sqrt((x - 0.46)**2 + (y - (-0.48))**2 + (z - 0.54)**2)
        d_eye_r = math.sqrt((x - (-0.46))**2 + (y - (-0.48))**2 + (z - 0.54)**2)
        if d_eye_l < 0.25:
            vgroups['eye_L'].add([v.index], 1.0, 'REPLACE')
            continue
        elif d_eye_r < 0.25:
            vgroups['eye_R'].add([v.index], 1.0, 'REPLACE')
            continue

        # Check if vertex belongs to Beak
        if has_beak and y < -0.56 and abs(x) < 0.30 and 0.24 < z < 0.74:
            vgroups['beak'].add([v.index], 1.0, 'REPLACE')
            continue

        # Body vertical smooth skinning
        if z < 0.24:
            vgroups['root'].add([v.index], max(0.0, 1.0 - z / 0.24), 'ADD')
            vgroups['body'].add([v.index], min(1.0, z / 0.24), 'ADD')
        elif z < 0.65:
            t = (z - 0.24) / 0.41
            vgroups['body'].add([v.index], 1.0 - t, 'ADD')
            vgroups['belly'].add([v.index], t, 'ADD')
        elif z < 0.95:
            t = (z - 0.65) / 0.30
            vgroups['belly'].add([v.index], 1.0 - t, 'ADD')
            vgroups['tip'].add([v.index], t, 'ADD')
        else:
            vgroups['tip'].add([v.index], 1.0, 'ADD')

    return arm_obj

def create_slime_animations(arm_obj):
    """
    Creates standard Axie Tactics animation tracks:
    1. Idle: 30 frames, looping gelatinous breathing wobble.
    2. Run: 24 frames, elastic forward hop with squash on impact.
    3. Attack: 30 frames, anticipation lean-back and fierce forward lunge.
    """
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode='POSE')
    pose_bones = arm_obj.pose.bones

    # ----------------------------------------------------
    # 1. ACTION: Idle (30 frames)
    # ----------------------------------------------------
    act_idle = bpy.data.actions.new("Idle")
    arm_obj.animation_data_create()
    arm_obj.animation_data.action = act_idle

    # Reset bones
    for b in pose_bones:
        b.location = (0, 0, 0)
        b.rotation_euler = (0, 0, 0)
        b.scale = (1, 1, 1)

    b_belly = pose_bones.get("belly")
    b_tip = pose_bones.get("tip")

    for frame, (sz, sxy, tip_rx) in [
        (0,  (1.00, 1.00, 0.00)),
        (15, (0.92, 1.05, 0.06)),
        (30, (1.00, 1.00, 0.00))
    ]:
        b_belly.scale = (sxy, sxy, sz)
        b_belly.keyframe_insert(data_path="scale", frame=frame)
        b_tip.rotation_euler = (tip_rx, 0, 0)
        b_tip.keyframe_insert(data_path="rotation_euler", frame=frame)

    # ----------------------------------------------------
    # 2. ACTION: Run (24 frames)
    # ----------------------------------------------------
    act_run = bpy.data.actions.new("Run")
    arm_obj.animation_data.action = act_run

    b_root = pose_bones.get("root")

    for frame, (lz, sz, sxy, tip_rx) in [
        (0,  (0.00, 0.84, 1.10, 0.00)),
        (6,  (0.24, 1.18, 0.90, -0.15)),
        (12, (0.42, 1.04, 0.98, 0.05)),
        (18, (0.16, 1.12, 0.94, 0.12)),
        (24, (0.00, 0.84, 1.10, 0.00))
    ]:
        b_root.location = (0, 0, lz)
        b_root.keyframe_insert(data_path="location", frame=frame)
        b_belly.scale = (sxy, sxy, sz)
        b_belly.keyframe_insert(data_path="scale", frame=frame)
        b_tip.rotation_euler = (tip_rx, 0, 0)
        b_tip.keyframe_insert(data_path="rotation_euler", frame=frame)

    # ----------------------------------------------------
    # 3. ACTION: Attack (30 frames)
    # ----------------------------------------------------
    act_atk = bpy.data.actions.new("Attack")
    arm_obj.animation_data.action = act_atk

    b_beak = pose_bones.get("beak")

    for frame, (ly, lz, sz, sxy, tip_rx, beak_rx) in [
        (0,  ( 0.00, 0.00, 1.00, 1.00,  0.00,  0.00)),
        (8,  ( 0.20, 0.00, 0.82, 1.12, -0.22,  0.35)), # Anticipation wind-up
        (13, (-0.46, 0.08, 1.22, 0.88,  0.32, -0.20)), # Explosive forward strike!
        (18, (-0.18, 0.02, 0.94, 1.04,  0.10,  0.00)), # Recoil wobble
        (24, (-0.05, 0.00, 1.04, 0.98, -0.04,  0.00)),
        (30, ( 0.00, 0.00, 1.00, 1.00,  0.00,  0.00))
    ]:
        b_root.location = (0, ly, lz)
        b_root.keyframe_insert(data_path="location", frame=frame)
        b_belly.scale = (sxy, sxy, sz)
        b_belly.keyframe_insert(data_path="scale", frame=frame)
        b_tip.rotation_euler = (tip_rx, 0, 0)
        b_tip.keyframe_insert(data_path="rotation_euler", frame=frame)
        if b_beak:
            b_beak.rotation_euler = (beak_rx, 0, 0)
            b_beak.keyframe_insert(data_path="rotation_euler", frame=frame)

    bpy.ops.object.mode_set(mode='OBJECT')

    # Push all actions to NLA tracks so GLTF exporter packages all 3 animations cleanly
    anim_data = arm_obj.animation_data
    for act in [act_idle, act_run, act_atk]:
        track = anim_data.nla_tracks.new()
        track.name = act.name
        track.strips.new(act.name, 0, act)

    # Set Idle as active default
    anim_data.action = act_idle

def generate_slime(variant='basic', out_dir=''):
    """Full pipeline for a specific Slime variant"""
    print(f"\n==========================================")
    print(f" Generating 3D Slime: [{variant}]")
    print(f"==========================================")
    clean_scene()

    # 1. Texture Atlas
    tex = create_slime_texture(variant=variant)
    mat = create_slime_material(tex, name=f"Mat_Slime_{variant}")

    # 2. Body & Eyes
    body = build_teardrop_body_mesh(name="Slime_Body")
    eye_l = build_eye_mesh(name="Eye_L", is_left=True)
    eye_r = build_eye_mesh(name="Eye_R", is_left=False)

    parts = [body, eye_l, eye_r]

    # 3. Add variant-specific parts
    if variant == 'attack':
        beak = build_beak_mesh(name="Beak")
        parts.append(beak)

    # Apply material to all parts
    for p in parts:
        p.data.materials.clear()
        p.data.materials.append(mat)

    # Join into single unified mesh (1 Mesh, 1 Material, 1 Texture -> Zero draw call overhead)
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts: p.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()
    unified_mesh = body
    unified_mesh.name = f"Slime_{variant.capitalize()}_Mesh"

    # Add Subdivision Surface (Level 1) for clean organic curves
    subsurf = unified_mesh.modifiers.new(name="Subsurf", type='SUBSURF')
    subsurf.levels = 1
    subsurf.render_levels = 1
    bpy.ops.object.modifier_apply(modifier="Subsurf")

    print(f"Unified Mesh Created: {len(unified_mesh.data.vertices)} vertices, {len(unified_mesh.data.polygons)} polygons")

    # 4. Rigging & Animations
    arm_obj = build_slime_armature_and_rig(unified_mesh, has_beak=(variant == 'attack'))
    create_slime_animations(arm_obj)

    # 5. Save .blend source file
    blend_path = os.path.join(out_dir, f"slime_{variant}.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"[OK] Saved Blender source: {blend_path}")

    # 6. Export optimized .glb for Three.js
    glb_path = os.path.join(out_dir, f"slime_{variant}.glb")
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        use_selection=False,
        export_animations=True,
        export_apply=True,
        export_image_format='AUTO'
    )
    print(f"[OK] Exported GLB model: {glb_path} ({os.path.getsize(glb_path)} bytes)")

if __name__ == '__main__':
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    models_dir = os.path.join(base_dir, 'assets', 'models')
    chimeras_dir = os.path.join(models_dir, 'chimeras')

    # Generate both variants
    generate_slime('basic', chimeras_dir)
    generate_slime('attack', chimeras_dir)

    # Also copy the final .glb directly into assets/models/ for immediate loading in Three.js
    for name in ['slime_basic.glb', 'slime_attack.glb']:
        src = os.path.join(chimeras_dir, name)
        dst = os.path.join(models_dir, name)
        if os.path.exists(src):
            with open(src, 'rb') as f_in, open(dst, 'wb') as f_out:
                f_out.write(f_in.read())
            print(f"[DEPLOYED] Copied {name} to {dst}")
