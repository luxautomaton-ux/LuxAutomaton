#!/bin/bash
# Lux Automaton Auto-Video Pipeline
# Generates video from script using local tools (ffmpeg, Ollama, optional Wav2Lip)

set -e

OUTPUT_DIR="${OUTPUT_DIR:-./output}"
AUDIO_DIR="${AUDIO_DIR:-./audio}"
TEMP_DIR="${TEMP_DIR:-./temp}"

mkdir -p "$OUTPUT_DIR" "$AUDIO_DIR" "$TEMP_DIR"

echo "=== Lux Auto-Video Pipeline ==="
echo "Output: $OUTPUT_DIR"

# Step 1: Generate script from topic (if not provided)
generate_script() {
    local topic="$1"
    local output_file="$2"
    
    echo "Generating script for topic: $topic"
    
    response=$(curl -s http://localhost:11434/api/generate -d "{
        \"model\": \"qwen2.5:7b\",
        \"prompt\": \"Write a 60-second YouTube Shorts script about $topic. Format: [HOOK], [BODY], [CTA]\",
        \"stream\": false
    }" 2>/dev/null)
    
    echo "$response" | python3 -c "import sys,json; print(json.load(sys.stdin).get('response',''))" > "$output_file"
    echo "Script saved to: $output_file"
}

# Step 2: Generate audio from script (using system TTS if available, else placeholder)
generate_audio() {
    local script_file="$1"
    local output_file="$2"
    
    echo "Generating audio from script..."
    
    if command -v say &> /dev/null; then
        # macOS built-in TTS
        cat "$script_file" | say -v Samantha -o "$output_file" 2>/dev/null || {
            echo "TTS failed, creating silent placeholder..."
            ffmpeg -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -t 10 -y "$output_file" >/dev/null 2>&1
        }
    else
        echo "No TTS available, creating silent placeholder..."
        ffmpeg -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -t 10 -y "$output_file" >/dev/null 2>&1
    fi
    
    echo "Audio saved to: $output_file"
}

# Step 3: Generate/assemble video frames
generate_frames() {
    local script_file="$1"
    local output_dir="$2"
    
    echo "Generating video frames..."
    mkdir -p "$output_dir"
    
    # Generate simple title cards using ImageMagick if available
    if command -v convert &> /dev/null; then
        convert -size 1080x1920 xc:black -fill white -pointsize 72 -gravity center -annotate 0 "Your Video Title" "$output_dir/frame_001.png"
        convert -size 1080x1920 xc:#1a1a1a -fill white -pointsize 48 -gravity center -annotate 0 "Content Here" "$output_dir/frame_002.png"
        convert -size 1080x1920 xc:#000000 -fill white -pointsize 72 -gravity center -annotate 0 "Subscribe!" "$output_dir/frame_003.png"
    else
        echo "ImageMagick not found. Using placeholder frames."
        # Create minimal PNG placeholders
        echo "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" | base64 -d > "$output_dir/frame_001.png"
        cp "$output_dir/frame_001.png" "$output_dir/frame_002.png"
        cp "$output_dir/frame_001.png" "$output_dir/frame_003.png"
    fi
    
    echo "Frames saved to: $output_dir"
}

# Step 4: Assemble video with ffmpeg
assemble_video() {
    local frames_dir="$1"
    local audio_file="$2"
    local output_file="$3"
    
    echo "Assembling video..."
    
    # Get audio duration
    duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$audio_file" 2>/dev/null || echo "10")
    
    # Create video from frames (3 seconds each)
    if command -v ffmpeg &> /dev/null; then
        ffmpeg -y \
            -loop 1 -i "$frames_dir/frame_001.png" \
            -loop 1 -i "$frames_dir/frame_002.png" \
            -loop 1 -i "$frames_dir/frame_003.png" \
            -i "$audio_file" \
            -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setpts=if(eq(N,0),0,1+PREV_N*TB)[v0]; [1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setpts=if(eq(N,0),0,1+PREV_N*TB)[v1]; [2:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setpts=if(eq(N,0),0,1+PREV_N*TB)[v2]; [v0][v1][v2]concat=n=3:v=1:a=0[v]" \
            -map "[v]" -map 3:a \
            -t "$duration" \
            -c:v libx264 -c:a aac \
            -pix_fmt yuv420p \
            "$output_file" 2>/dev/null
    else
        echo "ffmpeg not found. Cannot assemble video."
        return 1
    fi
    
    echo "Video assembled: $output_file"
}

# Optional: Apply Wav2Lip for lip-sync if avatar image provided
apply_lipsync() {
    local video_file="$1"
    local audio_file="$2"
    local output_file="$3"
    
    if [ -d "ReFlow-Studio" ] && [ -f "ReFlow-Studio/wav2lip.py" ]; then
        echo "Applying Wav2Lip sync..."
        python3 ReFlow-Studio/wav2lip.py --checkpoint_path ReFlow-Studio/checkpoints/wav2lip_gan.pth --face "$video_file" --audio "$audio_file" --outfile "$output_file"
    else
        echo "Wav2Lip not available. Skipping lip-sync."
        cp "$video_file" "$output_file"
    fi
}

# Main execution
main() {
    local topic="${1:-AI Automation}"
    local script_file="$TEMP_DIR/script.txt"
    local audio_file="$AUDIO_DIR/narration.wav"
    local frames_dir="$TEMP_DIR/frames"
    local video_file="$OUTPUT_DIR/video_raw.mp4"
    local final_file="$OUTPUT_DIR/video_final.mp4"
    
    # Generate content
    generate_script "$topic" "$script_file"
    generate_audio "$script_file" "$audio_file"
    generate_frames "$script_file" "$frames_dir"
    
    # Assemble
    assemble_video "$frames_dir" "$audio_file" "$video_file"
    
    # Optional lip-sync
    if [ "$2" == "--lipsync" ]; then
        apply_lipsync "$video_file" "$audio_file" "$final_file"
    else
        cp "$video_file" "$final_file"
    fi
    
    echo "=== Pipeline Complete ==="
    echo "Final video: $final_file"
}

# Run if executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
