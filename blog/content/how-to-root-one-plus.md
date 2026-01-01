# OnePlus 9 Pro Root Guide with Magisk

**Device:** OnePlus 9 Pro (LE2123)  
**Android Version:** 14  
**Method:** Magisk via patched boot image

---

## Important Warnings

- **Unlocking bootloader WILL WIPE ALL DATA** - Backup everything first
- Banking apps and some streaming apps may not work without additional configuration
- Warranty may be voided
- Process takes 30-60 minutes
- Requires USB cable and PC (Ubuntu/Linux recommended)

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Phase 1: Backup Your Data](#phase-1-backup-your-data)
3. [Phase 2: Enable Developer Options & OEM Unlocking](#phase-2-enable-developer-options--oem-unlocking)
4. [Phase 3: Unlock Bootloader](#phase-3-unlock-bootloader)
5. [Phase 4: Extract Boot Image](#phase-4-extract-boot-image)
6. [Phase 5: Patch Boot Image with Magisk](#phase-5-patch-boot-image-with-magisk)
7. [Phase 6: Flash Patched Boot Image](#phase-6-flash-patched-boot-image)
8. [Phase 7: Verify Root Access](#phase-7-verify-root-access)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software (Ubuntu/Linux PC)

```bash
# Install ADB and Fastboot
sudo apt update
sudo apt install -y adb fastboot

# Verify installation
adb version
fastboot --version
```

### Required Downloads

1. **Magisk App (Latest)**: https://github.com/topjohnwu/Magisk/releases
   - Download the `.apk` file (e.g., Magisk-30.6.apk)

2. **Oxygen Updater App**: Install from Google Play Store on your phone
   - Or download from: https://oxygenupdater.com/

3. **Payload Dumper** (for extracting boot image):
   ```bash
   pip install payload_dumper
   ```

---

## Phase 1: Backup Your Data

Before proceeding, backup:
- Photos, videos, documents
- Contacts (sync to Google account)
- App data
- Any important files

**Unlocking the bootloader will erase everything on your phone!**

---

## Phase 2: Enable Developer Options & OEM Unlocking

### On Your Phone:

1. **Enable Developer Options:**
   - Settings → About phone
   - Tap "Build number" 7 times
   - You'll see "You are now a developer!"

2. **Enable USB Debugging:**
   - Settings → System → Developer options
   - Toggle ON: "USB debugging"

3. **Enable OEM Unlocking:**
   - Settings → System → Developer options
   - Toggle ON: "OEM unlocking"
   - **This is critical - cannot unlock bootloader without this!**

4. **Connect Phone to PC:**
   - Use USB cable
   - Select "File Transfer" mode if prompted

### On Your PC:

```bash
# Test ADB connection
adb devices

# You should see a prompt on your phone
# Tap "Always allow from this computer" and "OK"

# Verify connection
adb devices
# Should show: f28e9679    device
```

---

## Phase 3: Unlock Bootloader

### ⚠️ WARNING: This will erase all data!

```bash
# Reboot to bootloader
adb reboot bootloader

# Your phone will show bootloader screen
# Verify fastboot connection
fastboot devices
# Should show: f28e9679    fastboot

# Unlock bootloader (WIPES ALL DATA!)
fastboot oem unlock
# OR on newer devices:
fastboot flashing unlock

# Follow on-screen instructions on phone:
# - Use Volume keys to navigate
# - Select "UNLOCK THE BOOTLOADER"
# - Press Power button to confirm
# - Phone will wipe and reboot
```

**Your phone will reboot and factory reset. Set it up again and re-enable USB debugging.**

---

## Phase 4: Extract Boot Image

### Method 1: Using Oxygen Updater (Recommended)

#### Step 1: Download Firmware

**On Your Phone:**
1. Open **Oxygen Updater** app
2. Select your device: OnePlus 9 Pro (LE2123)
3. Download the latest OxygenOS update
4. Wait for download to complete (3-5 GB, takes 10-30 minutes)

#### Step 2: Find and Transfer Firmware

**On Your PC:**

```bash
# Create working directory
mkdir -p ~/magisk-root
cd ~/magisk-root

# Find the downloaded firmware
adb shell "find /storage/emulated/0 -name '*.zip' -size +1000M 2>/dev/null"

# Example output:
# /storage/emulated/0/fc89d038f9ca4b54b02792dacf6b3ec9.zip

# Pull the firmware (adjust filename as needed)
adb pull /storage/emulated/0/fc89d038f9ca4b54b02792dacf6b3ec9.zip ./firmware.zip

# This is 5+ GB, will take several minutes
```

#### Step 3: Extract Boot Image

```bash
cd ~/magisk-root

# Extract payload.bin from firmware
unzip firmware.zip payload.bin

# Verify extraction
ls -lh payload.bin

# Extract boot.img using payload_dumper
payload_dumper payload.bin

# This extracts all partitions, takes 20-40 minutes
# Wait for "boot 100%" to appear

# Verify boot.img was extracted
ls -lh boot.img
# Should show: ~192M file
```

### Method 2: Check Which Slot is Active

```bash
# Check active boot slot
adb shell getprop ro.boot.slot_suffix
# Output: _a or _b

# You'll flash to this slot later
```

---

## Phase 5: Patch Boot Image with Magisk

### Step 1: Install Magisk App

```bash
# Install Magisk APK on your phone
adb install ~/Downloads/Magisk-30.6.apk

# Or if already on phone:
adb install /storage/emulated/0/Download/Magisk-30.6\(30600\).apk
```

### Step 2: Transfer Boot Image to Phone

```bash
cd ~/magisk-root

# Push boot.img to phone
adb push boot.img /sdcard/Download/boot.img

# Verify transfer
adb shell "ls -lh /sdcard/Download/boot.img"
```

### Step 3: Patch with Magisk

**On Your Phone:**

1. Open **Magisk** app
2. Tap **Install** button (next to "Magisk" at top)
3. Select **Select and Patch a File**
4. Navigate to **Downloads** folder
5. Select **boot.img**
6. Tap **Let's Go**
7. Wait ~30 seconds for patching
8. You'll see "All done!" when complete

Magisk creates: `/sdcard/Download/magisk_patched_xxxxx.img`

### Step 4: Pull Patched Boot Image

**On Your PC:**

```bash
cd ~/magisk-root

# Find the patched image
adb shell "ls -lh /sdcard/Download/magisk_patched*.img"

# Pull it (adjust filename as shown above)
adb pull /sdcard/Download/magisk_patched-30600_xxxxx.img ./magisk_patched.img

# Verify
ls -lh magisk_patched.img
```

---

## Phase 6: Flash Patched Boot Image

```bash
cd ~/magisk-root

# Reboot to bootloader
adb reboot bootloader

# Wait for bootloader screen
# Verify fastboot connection
fastboot devices

# Flash to the active slot (use _a or _b based on Phase 4 Step 2)
# If active slot was _b:
fastboot flash boot_b magisk_patched.img

# If active slot was _a:
fastboot flash boot_a magisk_patched.img

# Expected output:
# Sending 'boot_b' (196608 KB)    OKAY [  4.932s]
# Writing 'boot_b'                OKAY [  0.579s]
# Finished. Total time: 5.534s

# Reboot to system
fastboot reboot
```

**First boot may take 1-2 minutes. This is normal.**

---

## Phase 7: Verify Root Access

### Method 1: Via ADB Shell

```bash
# Wait for phone to boot completely
# Verify connection
adb devices

# Start shell
adb shell

# Request root
su

# CHECK YOUR PHONE SCREEN NOW!
# Magisk will show a Superuser Request popup
# Tap "Grant" or "Allow"

# Verify root
id
# Expected output:
# uid=0(root) gid=0(root) groups=0(root) context=u:r:magisk:s0

# Exit shell
exit
exit
```

### Method 2: Via Magisk App

**On Your Phone:**
1. Open **Magisk** app
2. Should show:
   - **Magisk: Installed**
   - **Version: 30.6** (or your version)
   - **Ramdisk: Yes**

### Method 3: Test Root Command

```bash
# From Ubuntu PC
adb shell "su -c id"
# Should output: uid=0(root) gid=0(root) ...
```

---

## Root

You now have root access on your OnePlus 9 Pro.

---

## Troubleshooting

### Issue: "OEM unlocking" option is greyed out

**Solution:**
- Ensure phone is connected to internet
- Wait 24-48 hours (some carriers have waiting period)
- Check if phone is carrier locked
- Try removing SIM card

### Issue: `fastboot devices` shows nothing

**Solution:**
```bash
# Try different USB port
# Install proper fastboot drivers (on Windows)
# On Linux, add udev rules:
sudo nano /etc/udev/rules.d/51-android.rules

# Add:
SUBSYSTEM=="usb", ATTR{idVendor}=="2a70", MODE="0666", GROUP="plugdev"

# Reload:
sudo udevadm control --reload-rules
```

### Issue: Boot loop after flashing Magisk

**Solution:**
```bash
# Boot to bootloader
adb reboot bootloader

# Flash original (unpatched) boot.img
fastboot flash boot_b boot.img

# Reboot
fastboot reboot

# Try patching again with latest Magisk
```

### Issue: "Permission denied" when running `su`

**Solution:**
- Check your phone screen for Magisk popup
- Open Magisk app and grant root permission manually
- Restart Magisk app
- Reboot phone

### Issue: Banking apps not working

**Solution:**
- Install **Magisk Hide** or use **Zygisk + DenyList**
- In Magisk app:
  - Settings → Enable Zygisk
  - Settings → Configure DenyList
  - Add banking apps to DenyList
  - Reboot phone

### Issue: SafetyNet failing

**Solution:**
- Install **Universal SafetyNet Fix** module
- Download from: https://github.com/kdrag0n/safetynet-fix
- In Magisk: Modules → Install from storage
- Reboot

---

## Additional Resources

- **Magisk Documentation**: https://topjohnwu.github.io/Magisk/
- **XDA OnePlus 9 Pro Forum**: https://xdaforums.com/f/oneplus-9-pro.12153/
- **Oxygen Updater**: https://oxygenupdater.com/

---

## Reverting to Stock (Unroot)

To unroot and restore stock boot:

```bash
# Reboot to bootloader
adb reboot bootloader

# Flash original boot.img
fastboot flash boot_a boot.img
fastboot flash boot_b boot.img

# Reboot
fastboot reboot
```

To fully lock bootloader again (wipes data again):
```bash
fastboot oem lock
# OR
fastboot flashing lock
```

---

## Notes

- Always keep a copy of your original `boot.img`
- OTA updates will remove root - you'll need to re-patch and flash
- Consider backing up your patched boot image for quick re-root
- Join OnePlus communities for support and updates

---

Stay vigilant. Stay secure.
