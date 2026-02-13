import os
import re
import json
import sys

# Check for tortoise installation
try:
    import torch
    import torchaudio
    from tortoise.api import TextToSpeech
    from tortoise.utils.audio import load_voice
except ImportError:
    print("Error: 'tortoise-tts' library not found.")
    print("Please install it using: pip install tortoise-tts")
    print("Note: You may need to install PyTorch first.")
    sys.exit(1)

# --- Configuration ---
# Voice to use. Tortoise comes with several (e.g., 'train_daws', 'tom', 'emma')
# You can add custom voices to the tortoise voices directory.
VOICE_NAME = 'tom' 
PRESET = 'fast' # Options: 'ultra_fast', 'fast', 'standard', 'high_quality'
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '../audio/story')

# --- Helper: Parse JS Object to Dict ---
def parse_js_objects(text):
    """
    Extracts JSON-like objects from a string using regex and cleans them up for JSON parsing.
    """
    objects = []
    # Match content between { and }
    # This is a simple parser and might fail on nested braces, but sufficient for this data structure
    pattern = re.compile(r'\{[^{}]+\}', re.DOTALL)
    
    matches = pattern.findall(text)
    for match in matches:
        # Clean up to valid JSON
        clean = match
        # Remove comments
        clean = re.sub(r'//.*', '', clean)
        # Quote keys (e.g. id: -> "id":)
        clean = re.sub(r'(\s)(\w+):', r'\1"\2":', clean)
        # Remove trailing commas
        clean = re.sub(r',(\s*})', r'\1', clean)
        # Replace single quotes with double quotes (simple heuristic)
        clean = clean.replace("'", '"')
        
        try:
            obj = json.loads(clean)
            objects.append(obj)
        except json.JSONDecodeError:
            # print(f"Skipping malformed object: {clean}")
            pass
            
    return objects

def load_story_events():
    events = []
    
    # 1. Load from Story.js
    story_path = os.path.join(os.path.dirname(__file__), '../Story.js')
    if os.path.exists(story_path):
        with open(story_path, 'r', encoding='utf8') as f:
            content = f.read()
            # Find the array content
            match = re.search(r'STORY_EVENTS\s*=\s*\[(.*?)\];', content, re.DOTALL)
            if match:
                events.extend(parse_js_objects(match.group(1)))
                
    # 2. Load from DLC (Earth Hero)
    dlc_path = os.path.join(os.path.dirname(__file__), '../dlc/rise_of_the_rock/index.js')
    if os.path.exists(dlc_path):
        with open(dlc_path, 'r', encoding='utf8') as f:
            content = f.read()
            # Find earthStory array
            match = re.search(r'earthStory\s*=\s*\[(.*?)\];', content, re.DOTALL)
            if match:
                events.extend(parse_js_objects(match.group(1)))
                
    return events

def main():
    # Initialize Tortoise
    print("Initializing Tortoise TTS...")
    try:
        # Use MPS (Metal Performance Shaders) if on macOS for acceleration, else CUDA or CPU
        device = 'cuda' if torch.cuda.is_available() else ('mps' if torch.backends.mps.is_available() else 'cpu')
        print(f"Using device: {device}")
        
        # Note: Tortoise might default to CUDA/CPU internally, but we can try to force it if supported
        tts = TextToSpeech(use_deepspeed=False, kv_cache=True) 
    except Exception as e:
        print(f"Failed to initialize Tortoise: {e}")
        return

    # Load Voice
    print(f"Loading voice: {VOICE_NAME}")
    voice_samples, conditioning_latents = load_voice(VOICE_NAME)
    
    # Load Events
    events = load_story_events()
    print(f"Found {len(events)} story events.")
    
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        
    for event in events:
        if 'text' not in event:
            continue
            
        # Determine ID
        file_id = event.get('id')
        if not file_id:
            wave = event.get('wave', '0')
            hero = event.get('hero', 'ALL')
            file_id = f"wave_{wave}_{hero}"
            
        file_path = os.path.join(OUTPUT_DIR, f"{file_id}.wav") # Tortoise outputs tensor, usually saved as wav
        
        if os.path.exists(file_path):
            print(f"Skipping {file_id} (already exists)")
            continue
            
        print(f"Generating audio for {file_id}...")
        text = event['text']
        
        try:
            gen = tts.tts_with_preset(
                text,
                voice_samples=voice_samples,
                conditioning_latents=conditioning_latents, 
                preset=PRESET
            )
            
            # Save
            # gen is a tensor of shape (1, N)
            torchaudio.save(file_path, gen.squeeze(0).cpu(), 24000)
            print(f"Saved {file_path}")
            
        except Exception as e:
            print(f"Error generating {file_id}: {e}")

if __name__ == "__main__":
    main()
