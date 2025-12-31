# Using a Logic Analyser to Work Out UART Baud Rate  

**Date:** December 31, 2025  
**Author:** Pinkhuff Team  

**Excerpt:** A guide on how to use a logic analyser to determine the baud rate of UART communication for reverse engineering and security testing.  

**Categories:** Embedded Systems, Security, Learning, Tools, UART  

---

## Why Do You Need to Find the Baud Rate?

In many reverse‑engineering or penetration‑testing scenarios you’ll encounter a device that communicates via UART but no documentation is available. Without knowing the baud rate you can’t:

- **Decode the traffic** – raw waveforms look like noise.  
- **Interact with the device** – you can’t send commands or read responses.  
- **Understand the protocol** – timing characteristics are crucial for security analysis.  

A logic analyser gives you a clean, time‑aligned view of the electrical waveform. From that, you can recover the bit‑timing and deduce the baud rate.

---

## What You’ll Need

| Item | Typical Value | Why It Matters |
|------|---------------|----------------|
| **Logic analyser** | Saleae Logic 8‑16 MHz, or any 8‑bit analyser with 100 Mbps+ capture rate | Adequate sampling rate to resolve UART bits. |
| **Jumper wires** | 2‑3 mm or longer, 20 AWG | Connect TX/TX‑LED or pin to analyser channel. |
| **Probe** | 10 × 1 MΩ or lower | Avoid loading the signal. |
| **Software** | Saleae Logic, Sigrok/Chimera, or open‑source alternatives | For waveform capture and analysis. |
| **Target device** | Any UART‑enabled board, MCU, or sensor | The source of the data stream. |
| **Optional** | Power‑good cable, ground reference | Ensures signal integrity. |

> **Tip:** If you only have a single channel, you can still capture UART, but you’ll need to manually align edges. Two channels (TX and RX) make for a clearer view.

---

## Step‑by‑Step Workflow

1. **Set up the hardware**  
   - Connect the analyser probe to the UART TX pin.  
   - Ground the probe to the device’s ground.  
   - If you’re on a board with a status LED, you can connect the LED pin to a second channel to cross‑check timing.  

2. **Configure the analyser software**  
   - Set a **high sampling rate** (≥ 10× the highest expected baud).  
   - Enable **edge detection** on the channel if your software supports it; otherwise set the analyser to capture raw samples.  
   - If using Saleae Logic:  
     - **Protocol → UART** → **Channel → 8‑bit**.  
     - Leave **Parity, Stop bits, Start bits** at defaults – you’ll tweak them later.  

3. **Start capturing**  
   - Hit **Capture** and let it run for at least 1–2 seconds.  
   - You’ll see a series of voltage transitions.  
   - Stop capture when you have enough data.

4. **Identify a stable pattern**  
   - Look for a clear **start‑bit** (low), **data bits** (LSB‑first), **stop‑bit** (high).  
   - If the signal is noisy, use the analyser’s **noise reduction** features or filter by voltage threshold.  

5. **Measure the period of a bit**  
   - Count the number of sample ticks from the middle of one bit to the middle of the next.  
   - **Example:** In Saleae, hover over a start‑bit → the software shows **time per bit** in µs.  
   - If you’re using raw samples, you can calculate:  

     ```text
     bit_time = (t_end - t_start) / samples_per_bit
     baud_rate = 1 / bit_time
     ```

   - **Tip:** A single bit may span 8–10 samples, but many samples per bit give a more accurate average.  

6. **Validate with multiple bit periods**  
   - Compute the average over several bytes to mitigate jitter.  
   - Compare with common baud rates (9600, 19200, 38400, 57600, 115200, etc.).  
   - If the value is non‑standard (e.g., 57678), the device may use a non‑canonical baud rate; proceed with the exact figure.  

7. **Confirm with protocol decode**  
   - Set the analyser to decode UART with the identified baud rate.  
   - Verify that the decoded ASCII (or binary) stream matches expectations (e.g., “OK”, “ERROR”).  
   - If the stream still looks garbled, double‑check start/stop bit settings and parity.  

8. **Optional: Use an oscilloscope**  
   - Cross‑validate the logic analyser result with a cheap oscilloscope.  
   - Measure the high‑to‑low transition of a start bit; divide the period by the number of samples to confirm the same baud rate.  

---

## Common Pitfalls & How to Avoid Them

| Problem | Fix |
|---------|-----|
| **Noise & false edges** | Use a proper probe, shielded cable, and ensure the ground reference is solid. |
| **Low sampling rate** | Double‑check the analyser’s sample clock. A 5 MHz clock cannot reliably capture 115 200 baud. |
| **Wrong bit alignment** | Enable **clock recovery** or manually adjust the start bit edge in the software. |
| **Parity mis‑match** | Start with “None” parity; switch to “Even/Mark/Space” only if the decoded data shows repeated errors. |
| **Jitter in the source** | Capture over a longer period and compute the average. |
| **Device resets during capture** | Disable auto‑reset pins or use a power‑good cable to maintain constant power. |

---

## Sample Workflow in Saleae Logic (Screenshot Guide)

1. **Connect Channel**  

2. **Configure UART Settings**  

3. **Start Capture**  

4. **View Decoded Data**  

*(Replace the placeholder links with your own screenshots when publishing.)*

---

## Real‑World Example: Decoding a 115 200 baud Stream

| Step | Result |
|------|--------|
| **Capture** | 0.5 s of data on Channel 1. |
| **Measure Bit Period** | 8.68 µs → **Baud ≈ 115 200** |
| **Decode** | Successfully read “AT+GMR” from the device. |
| **Cross‑Check** | Using an oscilloscope, the start bit period is 8.7 µs. |

This confirms that the device uses the standard 115 200 baud.  

---

## Take‑Away Points

1. **Logic analysers are your best friend** for UART reverse engineering.  
2. **Sampling rate > 10× baud** ensures clean edges.  
3. **Measure multiple bits** to get an accurate average.  
4. **Cross‑validate** with an oscilloscope or software decode.  

With these steps, you’ll quickly unlock UART traffic and pave the way for deeper protocol analysis or firmware extraction.

Stay vigilant. Stay secure.