from open_mythos.main import OpenMythos, MythosConfig
import torch
import time

def demo_mythos_reasoning():
    print("--- Lux Automaton: OpenMythos Reasoning Enhancement ---")
    
    # Configuration for Deep Reasoning (Small version for demo)
    config = MythosConfig(
        vocab_size=1000,
        dim=256,
        n_heads=8,
        n_kv_heads=2,
        max_seq_len=512,
        max_loop_iters=4, # Thinking depth
        prelude_layers=1,
        coda_layers=1,
        attn_type="gqa", # Simpler for demo
        n_experts=8,
        n_experts_per_tok=2
    )
    
    print(f"Initializing OpenMythos Model (Dim: {config.dim}, Recurrent Depth: {config.max_loop_iters})...")
    
    try:
        model = OpenMythos(config)
        
        # Simulated input tokens (Batch size 1, Sequence length 10)
        input_tokens = torch.randint(0, 1000, (1, 10))
        
        print("Starting Recurrent Reasoning Cycles (Latent Thinking)...")
        start_time = time.time()
        
        # Execute the model
        with torch.no_grad():
            logits = model(input_tokens)
            
        end_time = time.time()
        
        print(f"Reasoning Complete. Logits Shape: {logits.shape}")
        print(f"Total Thinking Time: {end_time - start_time:.4f}s")
        print("\n[SUCCESS] OpenMythos is now integrated and functional.")
        print("The agent can now use recurrent transformer blocks for complex task planning.")

    except Exception as e:
        print(f"[ERROR] Mythos Reasoning failed: {e}")

if __name__ == "__main__":
    demo_mythos_reasoning()
