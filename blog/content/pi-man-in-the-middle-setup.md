# Security Analysis Tools Setup Guide
## mitmproxy, Wireshark, and Frida Configuration

**Prerequisites:** Raspberry Pi WiFi access point already configured and running. See previous blog "Setting up a Raspberry Pi as an isolated router"

---

## Table of Contents

- [Part 1: mitmproxy Setup](#part-1-mitmproxy-setup)
- [Part 2: Certificate Installation](#part-2-certificate-installation)
- [Part 3: Wireshark Setup](#part-3-wireshark-setup)
- [Part 4: Frida Setup](#part-4-frida-setup)
- [Part 5: Complete Analysis Workflow](#part-5-complete-analysis-workflow)
- [Appendix: Frida Scripts](#appendix-frida-scripts)

---

## Part 1: mitmproxy Setup

mitmproxy is a transparent HTTPS proxy that intercepts and decrypts SSL/TLS traffic for analysis.

### 1.1 Install mitmproxy on Raspberry Pi

```bash
# SSH to Raspberry Pi
ssh pi@192.168.100.2

# Update and install
sudo apt update
sudo apt install -y mitmproxy python3-pip

# Verify installation
mitmproxy --version
```

### 1.2 Create Configuration

```bash
# Create mitmproxy config directory
mkdir -p ~/.mitmproxy

# Create config file
nano ~/.mitmproxy/config.yaml
```

**Add the following:**

```yaml
# Listen on all interfaces
web_host: 0.0.0.0
web_port: 8081

# Transparent proxy mode
mode: transparent

# Show full URLs in logs
showhost: true

# Save all traffic to file
save_stream_file: /home/pi/captures/mitmproxy-flows.mitm

# Don't block connections without valid certs (for IoT devices)
ssl_insecure: true
```

Save and exit (Ctrl+X, Y, Enter).

### 1.3 Create Captures Directory

```bash
mkdir -p /home/pi/captures
chmod 755 /home/pi/captures
```

### 1.4 Configure iptables to Redirect Traffic

This redirects HTTP and HTTPS traffic to mitmproxy:

```bash
# Redirect HTTP (port 80) to mitmproxy (port 8080)
sudo iptables -t nat -A PREROUTING -i wlan0 -p tcp --dport 80 -j REDIRECT --to-port 8080

# Redirect HTTPS (port 443) to mitmproxy (port 8080)
sudo iptables -t nat -A PREROUTING -i wlan0 -p tcp --dport 443 -j REDIRECT --to-port 8080

# Save rules
sudo netfilter-persistent save
```

### 1.5 Create mitmweb systemd Service

Create a service to run mitmproxy automatically:

```bash
sudo nano /etc/systemd/system/mitmweb.service
```

**Add:**

```ini
[Unit]
Description=mitmproxy web interface
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/pi
ExecStart=/usr/bin/mitmweb --mode transparent --showhost --web-host 0.0.0.0 --ssl-insecure
Restart=on-failure
RestartSec=5
StandardOutput=append:/home/pi/captures/mitmweb.log
StandardError=append:/home/pi/captures/mitmweb.log

[Install]
WantedBy=multi-user.target
```

Save and exit.

### 1.6 Enable and Start mitmweb

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable to start on boot
sudo systemctl enable mitmweb

# Start now
sudo systemctl start mitmweb

# Check status
sudo systemctl status mitmweb
# Should show "active (running)" in green
```

### 1.7 Access mitmproxy Web Interface

From your Ubuntu PC, open a browser:

```
http://192.168.100.2:8081
```

You should see the mitmproxy web interface. It will be empty until devices connect and make requests.

### 1.8 Test mitmproxy

**Temporary test (without certificate):**

1. Connect a device to TapoResearchLab WiFi
2. Try to visit an HTTPS site (it will fail with certificate error)
3. Check mitmweb interface - you should see the connection attempt
4. This is expected - we need to install the certificate next

---

## Part 2: Certificate Installation

For mitmproxy to decrypt HTTPS traffic, devices must trust its CA certificate.

### 2.1 Access Certificate Download Page

**From a device connected to TapoResearchLab WiFi:**

1. Open a web browser
2. Navigate to: `http://mitm.it`
3. You'll see the mitmproxy certificate installation page

### 2.2 Install on Android Device

#### Method 1: Via mitm.it Portal (Easiest)

1. On Android, connect to TapoResearchLab WiFi
2. Open Chrome browser
3. Go to: `http://mitm.it`
4. Tap the **Android** icon
5. Download the certificate (mitmproxy-ca-cert.cer)
6. Go to **Settings → Security → Encryption & credentials**
7. Tap **Install a certificate → CA certificate**
8. Tap **Install anyway** (warning message)
9. Browse to Downloads, select `mitmproxy-ca-cert.cer`
10. Give it a name: "mitmproxy Research"
11. Tap OK

#### Method 2: Manual Transfer

**From Raspberry Pi:**

```bash
# Certificate is auto-generated here:
cat ~/.mitmproxy/mitmproxy-ca-cert.pem
```

Transfer to Android via USB or copy to a file and download.

#### Android 11+ Important Note

On Android 11 and later, user-installed certificates are **not trusted by apps** by default. You have two options:

**Option A: Root device and install as system certificate**
```bash
# Requires root access via Magisk
adb push ~/.mitmproxy/mitmproxy-ca-cert.pem /sdcard/
adb shell
su
mount -o rw,remount /system
cp /sdcard/mitmproxy-ca-cert.pem /system/etc/security/cacerts/
chmod 644 /system/etc/security/cacerts/mitmproxy-ca-cert.pem
reboot
```

**Option B: Use Frida to bypass certificate pinning (recommended)**

We'll cover this in Part 4 - Frida Setup.

### 2.3 Verify Certificate Installation

**On Android:**

1. Settings → Security → Encryption & credentials → User certificates
2. You should see "mitmproxy Research" or similar
3. Open Chrome browser
4. Visit `https://google.com`
5. Check mitmweb at `http://192.168.100.2:8081` from Ubuntu PC
6. You should now see the decrypted HTTPS request

### 2.4 TP-Link Tapo Camera Certificate

**Important:** The Tapo camera **cannot** install certificates. This is expected.

**For Tapo camera analysis:**
- Camera will **fail** to connect through mitmproxy (certificate validation fails)
- Use **Wireshark** to capture encrypted camera traffic
- Use **Android app with Frida** to analyze API calls instead
- Optionally: Create separate WiFi network without mitmproxy for camera only

### 2.5 Certificate Troubleshooting

**Certificate not showing in Android:**
- Check file was downloaded completely
- Try downloading from mitm.it again
- Ensure WiFi is connected to TapoResearchLab

**Still getting certificate errors:**
- Verify mitmweb is running: `sudo systemctl status mitmweb`
- Check certificate is installed in Settings → Security
- For apps, you may need Frida (see Part 4)

---

## Part 3: Wireshark Setup

Wireshark captures all network packets for detailed analysis.

### 3.1 Install Wireshark on Raspberry Pi

```bash
sudo apt install -y wireshark tshark tcpdump

# Add user to wireshark group for non-root capture
sudo usermod -aG wireshark pi

# Log out and back in for group to take effect
exit
ssh pi@192.168.100.2
```

### 3.2 Basic Packet Capture with tcpdump

**Capture all traffic on wlan0:**

```bash
sudo tcpdump -i wlan0 -w /home/pi/captures/full-capture.pcap
# Press Ctrl+C to stop
```

**Capture specific device (e.g., Tapo camera):**

```bash
# Find device IP first (check DHCP leases or router)
cat /var/lib/misc/dnsmasq.leases

# Capture traffic from/to specific IP
sudo tcpdump -i wlan0 host 192.168.50.20 -w /home/pi/captures/tapo-camera.pcap
```

**Capture with timestamp in filename:**

```bash
sudo tcpdump -i wlan0 -w /home/pi/captures/capture-$(date +%Y%m%d-%H%M%S).pcap
```

### 3.3 Transfer Captures to Ubuntu PC

```bash
# From Ubuntu PC
scp pi@192.168.100.2:/home/pi/captures/*.pcap ~/research/

# Or use rsync for multiple files
rsync -avz pi@192.168.100.2:/home/pi/captures/ ~/research/captures/
```

### 3.4 Analyze with Wireshark on Ubuntu PC

```bash
# Install Wireshark on Ubuntu if not already installed
sudo apt install -y wireshark

# Add user to wireshark group
sudo usermod -aG wireshark $USER
# Log out and back in

# Open capture file
wireshark ~/research/full-capture.pcap
```

### 3.5 Useful Wireshark Filters

**Filter by device IP:**
```
ip.addr == 192.168.50.20
```

**Show only HTTPS/TLS traffic:**
```
tls
```

**Show DNS queries:**
```
dns
```

**Filter by domain name:**
```
dns.qry.name contains "tplinkcloud"
```

**Show HTTP traffic (unencrypted):**
```
http
```

**Show traffic to/from specific server:**
```
ip.addr == 54.123.45.67
```

**Follow TCP stream:**
1. Right-click on a packet
2. Follow → TCP Stream
3. View the entire conversation

### 3.6 Automated Capture Script

Create `/home/pi/start-capture.sh`:

```bash
#!/bin/bash

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
CAPTURE_DIR="/home/pi/captures"
INTERFACE="wlan0"

echo "[*] Starting packet capture on $INTERFACE"
echo "[*] Timestamp: $TIMESTAMP"
echo "[*] Press Ctrl+C to stop"

sudo tcpdump -i $INTERFACE -w $CAPTURE_DIR/capture-$TIMESTAMP.pcap

echo "[+] Capture saved to: $CAPTURE_DIR/capture-$TIMESTAMP.pcap"
```

Make executable:

```bash
chmod +x /home/pi/start-capture.sh
```

Use it:

```bash
~/start-capture.sh
# Press Ctrl+C when done
```

### 3.7 Capture Specific Traffic Types

**Only DNS queries:**
```bash
sudo tcpdump -i wlan0 port 53 -w dns-capture.pcap
```

**Only HTTPS:**
```bash
sudo tcpdump -i wlan0 port 443 -w https-capture.pcap
```

**Multiple ports:**
```bash
sudo tcpdump -i wlan0 'port 80 or port 443' -w web-traffic.pcap
```

**Exclude SSH traffic (from your own connections):**
```bash
sudo tcpdump -i wlan0 'not port 22' -w no-ssh-capture.pcap
```

---

## Part 4: Frida Setup

Frida enables dynamic instrumentation of Android apps to bypass security controls and log behavior.

### 4.1 Prepare Android Device

**Enable Developer Options:**

1. Settings → About phone
2. Tap "Build number" 7 times
3. Developer options are now enabled

**Enable USB Debugging:**

1. Settings → Developer options
2. Enable "USB debugging"
3. Connect USB cable to Ubuntu PC
4. Tap "Allow" on Android when prompted

### 4.2 Install ADB on Ubuntu PC

```bash
# Should already be installed, verify
adb version

# If not installed:
sudo apt install -y adb android-tools-adb

# Test connection
adb devices
# Should show your device with "device" status
```

**If showing "unauthorized":**
- Check Android screen for authorization prompt
- Tap "Always allow from this computer"
- Try `adb devices` again

### 4.3 Install Frida Tools on Ubuntu PC

```bash
# Create virtual environment
python3 -m venv ~/frida-env
source ~/frida-env/bin/activate

# Install Frida
pip install frida-tools

# Verify
frida --version

# Add alias to .bashrc for easy activation
echo 'alias frida-env="source ~/frida-env/bin/activate"' >> ~/.bashrc
```

### 4.4 Install Frida Server on Android

**Find Android architecture:**

```bash
adb shell getprop ro.product.cpu.abi
# Common outputs:
# arm64-v8a (most modern phones)
# armeabi-v7a (older phones)
# x86 or x86_64 (emulators)
```

**Download Frida Server:**

Visit: https://github.com/frida/frida/releases

Download the appropriate version for your architecture.

Example for arm64:

```bash
cd ~/Downloads
wget https://github.com/frida/frida/releases/download/16.1.10/frida-server-16.1.10-android-arm64.xz

# Extract
unxz frida-server-16.1.10-android-arm64.xz

# Rename for convenience
mv frida-server-16.1.10-android-arm64 frida-server
```

**Push to Android:**

```bash
adb push frida-server /data/local/tmp/
adb shell "chmod 755 /data/local/tmp/frida-server"
```

**Start Frida Server:**

```bash
# With root (recommended)
adb shell "su -c /data/local/tmp/frida-server &"

# Without root (limited functionality)
adb shell "/data/local/tmp/frida-server &"
```

**Keep it running in background:**

```bash
adb shell "nohup su -c /data/local/tmp/frida-server >/dev/null 2>&1 &"
```

### 4.5 Verify Frida Connection

```bash
# Activate Frida environment
source ~/frida-env/bin/activate

# List running processes on Android
frida-ps -U

# Should show list of apps and processes
```

**If "Failed to enumerate processes":**
- Frida server not running
- Wrong Frida version (must match frida-tools version)
- USB debugging not authorized

### 4.6 Find TP-Link Tapo App Package Name

```bash
# List all packages
adb shell pm list packages | grep -i tapo

# Common Tapo package names:
# com.tplink.iot
# com.tplink.kasa_android
```

If not found, install the app:

```bash
# Download APK from APKMirror or Play Store
adb install ~/Downloads/tapo-app.apk
```

### 4.7 Test Frida with Simple Script

Create `~/frida-scripts/test.js`:

```javascript
Java.perform(function() {
    console.log("[*] Frida is working!");
    console.log("[*] Android version: " + Java.androidVersion);
});
```

Run it:

```bash
# Replace com.tplink.iot with your actual package name
frida -U -f com.tplink.iot -l ~/frida-scripts/test.js --no-pause
```

You should see the messages in the console.

---

## Part 5: Complete Analysis Workflow

Now let's put all the tools together for comprehensive analysis.

### 5.1 Start All Services

**On Raspberry Pi:**

```bash
# Verify mitmweb is running
sudo systemctl status mitmweb

# Start packet capture
cd ~/
./start-capture.sh
# This will run until you press Ctrl+C
```

**On Ubuntu PC:**

Open browser to mitmproxy web interface:
```
http://192.168.100.2:8081
```

Start Frida (in another terminal):
```bash
source ~/frida-env/bin/activate
# We'll run specific scripts shortly
```

### 5.2 Connect Test Devices

1. **Connect Android phone** to TapoResearchLab WiFi
   - Password: ResearchLab2024!
   - Should get IP: 192.168.50.15 (or similar)

2. **Connect Tapo camera** using the Tapo app
   - Open Tapo app on Android
   - Add device / Configure camera
   - Connect camera to TapoResearchLab WiFi

### 5.3 Run Frida with Analysis Scripts

**Terminal 1 - SSL Pinning Bypass + API Logger:**

Create `~/frida-scripts/tapo-analysis.js`:

```javascript
Java.perform(function() {
    console.log("[*] Tapo Analysis Started");
    
    // ===== SSL PINNING BYPASS =====
    var X509TrustManager = Java.use('javax.net.ssl.X509TrustManager');
    var SSLContext = Java.use('javax.net.ssl.SSLContext');
    
    var TrustManager = Java.registerClass({
        name: 'dev.research.TrustManager',
        implements: [X509TrustManager],
        methods: {
            checkClientTrusted: function(chain, authType) {},
            checkServerTrusted: function(chain, authType) {},
            getAcceptedIssuers: function() { return []; }
        }
    });
    
    var TrustManagers = [TrustManager.$new()];
    
    SSLContext.init.overload(
        '[Ljavax.net.ssl.KeyManager;',
        '[Ljavax.net.ssl.TrustManager;',
        'java.security.SecureRandom'
    ).implementation = function(km, tm, sr) {
        console.log('[+] SSLContext.init() - SSL pinning bypassed');
        this.init(km, TrustManagers, sr);
    };
    
    // OkHttp Certificate Pinner bypass
    try {
        var CertificatePinner = Java.use('okhttp3.CertificatePinner');
        CertificatePinner.check.overload('java.lang.String', 'java.util.List').implementation = function(hostname, peerCertificates) {
            console.log('[+] Certificate pinning bypassed for: ' + hostname);
            return;
        };
    } catch(err) {
        console.log('[-] OkHttp CertificatePinner not found');
    }
    
    // ===== API REQUEST LOGGING =====
    try {
        var OkHttpClient = Java.use('okhttp3.OkHttpClient');
        var Buffer = Java.use('okio.Buffer');
        
        OkHttpClient.newCall.implementation = function(request) {
            console.log('\n[+] ===== HTTP REQUEST =====');
            console.log('URL: ' + request.url().toString());
            console.log('Method: ' + request.method());
            
            var headers = request.headers();
            console.log('Headers:');
            for (var i = 0; i < headers.size(); i++) {
                console.log('  ' + headers.name(i) + ': ' + headers.value(i));
            }
            
            var requestBody = request.body();
            if (requestBody != null) {
                try {
                    var buffer = Buffer.$new();
                    requestBody.writeTo(buffer);
                    console.log('Body: ' + buffer.readUtf8());
                } catch(e) {
                    console.log('Body: [Binary]');
                }
            }
            console.log('[+] ========================\n');
            
            return this.newCall(request);
        };
    } catch(err) {
        console.log('[-] OkHttp hooking failed: ' + err);
    }
    
    // ===== CREDENTIALS LOGGING =====
    try {
        var SharedPreferences = Java.use('android.app.SharedPreferencesImpl');
        
        SharedPreferences.getString.overload('java.lang.String', 'java.lang.String').implementation = function(key, defValue) {
            var value = this.getString(key, defValue);
            if (key.toLowerCase().includes('token') || 
                key.toLowerCase().includes('password') ||
                key.toLowerCase().includes('auth') ||
                key.toLowerCase().includes('key')) {
                console.log('[!] SharedPrefs GET - ' + key + ': ' + value);
            }
            return value;
        };
        
        SharedPreferences.putString.overload('java.lang.String', 'java.lang.String').implementation = function(key, value) {
            if (key.toLowerCase().includes('token') || 
                key.toLowerCase().includes('password') ||
                key.toLowerCase().includes('auth') ||
                key.toLowerCase().includes('key')) {
                console.log('[!] SharedPrefs PUT - ' + key + ': ' + value);
            }
            return this.putString(key, value);
        };
    } catch(err) {
        console.log('[-] SharedPreferences hooking failed');
    }
    
    console.log('[+] All hooks installed successfully');
});
```

Run it:

```bash
source ~/frida-env/bin/activate
frida -U -f com.tplink.iot -l ~/frida-scripts/tapo-analysis.js --no-pause
```

### 5.4 Interact with Tapo App

With Frida running, use the Tapo app normally:

1. Open Tapo app
2. Log in (watch Frida console for credentials)
3. View camera feed
4. Change camera settings
5. Check camera status

**What you'll see:**

- **Frida console:** All API calls, tokens, credentials
- **mitmproxy web interface:** Decrypted HTTPS requests
- **Wireshark (later):** All network packets

### 5.5 Stop and Analyze Captures

**Stop packet capture:**
- Press Ctrl+C in the tcpdump terminal

**Transfer capture to Ubuntu PC:**

```bash
# From Ubuntu PC
scp pi@192.168.100.2:/home/pi/captures/capture-*.pcap ~/research/
```

**Analyze in Wireshark:**

```bash
wireshark ~/research/capture-*.pcap
```

**View mitmproxy flows:**

```bash
# On Raspberry Pi
mitmproxy -r ~/captures/mitmproxy-flows.mitm

# Or copy to Ubuntu PC and view there
scp pi@192.168.100.2:/home/pi/captures/mitmproxy-flows.mitm ~/research/
mitmproxy -r ~/research/mitmproxy-flows.mitm
```

---

## Appendix: Frida Scripts

### A.1 Universal SSL Pinning Bypass

Save as `~/frida-scripts/ssl-bypass.js`:

```javascript
Java.perform(function() {
    console.log("[*] Universal SSL Pinning Bypass");
    
    // Standard TrustManager bypass
    var X509TrustManager = Java.use('javax.net.ssl.X509TrustManager');
    var SSLContext = Java.use('javax.net.ssl.SSLContext');
    
    var TrustManager = Java.registerClass({
        name: 'dev.ssl.bypass.TrustManager',
        implements: [X509TrustManager],
        methods: {
            checkClientTrusted: function(chain, authType) {},
            checkServerTrusted: function(chain, authType) {},
            getAcceptedIssuers: function() { return []; }
        }
    });
    
    SSLContext.init.overload(
        '[Ljavax.net.ssl.KeyManager;',
        '[Ljavax.net.ssl.TrustManager;',
        'java.security.SecureRandom'
    ).implementation = function(km, tm, sr) {
        this.init(km, [TrustManager.$new()], sr);
    };
    
    // OkHttp3
    try {
        var CertificatePinner = Java.use('okhttp3.CertificatePinner');
        CertificatePinner.check.overload('java.lang.String', 'java.util.List').implementation = function() {
            console.log('[+] OkHttp pinning bypassed');
        };
    } catch(e) {}
    
    // TrustKit
    try {
        var TrustKit = Java.use('com.datatheorem.android.trustkit.pinning.OkHostnameVerifier');
        TrustKit.verify.overload('java.lang.String', 'javax.net.ssl.SSLSession').implementation = function() {
            console.log('[+] TrustKit bypassed');
            return true;
        };
    } catch(e) {}
    
    // Apache HTTPClient
    try {
        var AbstractVerifier = Java.use('org.apache.http.conn.ssl.AbstractVerifier');
        AbstractVerifier.verify.overload('java.lang.String', '[Ljava.lang.String', '[Ljava.lang.String', 'boolean').implementation = function() {
            console.log('[+] Apache HTTPClient bypassed');
        };
    } catch(e) {}
    
    console.log("[+] SSL Pinning Bypass Complete");
});
```

### A.2 Network Traffic Logger

Save as `~/frida-scripts/network-logger.js`:

```javascript
Java.perform(function() {
    console.log("[*] Network Traffic Logger Started");
    
    // Log all URL connections
    var URL = Java.use('java.net.URL');
    URL.openConnection.overload().implementation = function() {
        console.log('[+] URL.openConnection: ' + this.toString());
        return this.openConnection();
    };
    
    // Log OkHttp requests
    try {
        var OkHttpClient = Java.use('okhttp3.OkHttpClient');
        OkHttpClient.newCall.implementation = function(request) {
            var url = request.url().toString();
            var method = request.method();
            console.log('[+] ' + method + ' ' + url);
            return this.newCall(request);
        };
    } catch(e) {
        console.log('[-] OkHttp not found');
    }
});
```

### A.3 Root Detection Bypass

Save as `~/frida-scripts/root-bypass.js`:

```javascript
Java.perform(function() {
    console.log("[*] Root Detection Bypass");
    
    // Common root detection libraries
    try {
        var RootBeer = Java.use('com.scottyab.rootbeer.RootBeer');
        RootBeer.isRooted.implementation = function() {
            console.log('[+] Root check bypassed (RootBeer)');
            return false;
        };
    } catch(e) {}
    
    // File existence checks
    var File = Java.use('java.io.File');
    File.exists.implementation = function() {
        var path = this.getAbsolutePath();
        if (path.indexOf('su') !== -1 || 
            path.indexOf('magisk') !== -1 ||
            path.indexOf('supersu') !== -1) {
            console.log('[+] Hiding root file: ' + path);
            return false;
        }
        return this.exists();
    };
    
    console.log("[+] Root Detection Bypass Complete");
});
```

### A.4 Crypto Key Dumper

Save as `~/frida-scripts/crypto-dump.js`:

```javascript
Java.perform(function() {
    console.log("[*] Crypto Key Dumper Started");
    
    var SecretKeySpec = Java.use('javax.crypto.spec.SecretKeySpec');
    
    SecretKeySpec.$init.overload('[B', 'java.lang.String').implementation = function(key, algorithm) {
        console.log('\n[!] ===== ENCRYPTION KEY =====');
        console.log('Algorithm: ' + algorithm);
        console.log('Key Length: ' + key.length + ' bytes');
        
        var hexKey = '';
        for (var i = 0; i < key.length; i++) {
            hexKey += ('0' + (key[i] & 0xFF).toString(16)).slice(-2);
        }
        console.log('Key (hex): ' + hexKey);
        console.log('[!] ===========================\n');
        
        return this.$init(key, algorithm);
    };
});
```

---

## Quick Reference

### Start Complete Analysis Session

```bash
# Terminal 1 - Raspberry Pi: Start packet capture
ssh pi@192.168.100.2
~/start-capture.sh

# Terminal 2 - Ubuntu PC: Start Frida
source ~/frida-env/bin/activate
frida -U -f com.tplink.iot -l ~/frida-scripts/tapo-analysis.js --no-pause

# Browser - mitmproxy web interface
# Open: http://192.168.100.2:8081
```

### View Logs in Real-Time

```bash
# mitmproxy logs on Pi
ssh pi@192.168.100.2
tail -f ~/captures/mitmweb.log

# DHCP leases (connected devices)
cat /var/lib/misc/dnsmasq.leases

# Live packet stats
sudo iftop -i wlan0
```

### Stop and Save

```bash
# Stop tcpdump: Ctrl+C
# Stop Frida: Ctrl+C

# Transfer all captures
scp pi@192.168.100.2:/home/pi/captures/* ~/research/$(date +%Y%m%d)/
```

---

## Troubleshooting

### mitmproxy Not Intercepting Traffic

```bash
# Check service status
sudo systemctl status mitmweb

# Check iptables rules
sudo iptables -t nat -L -n -v | grep 8080

# Restart mitmproxy
sudo systemctl restart mitmweb
```

### Frida Connection Failed

```bash
# Check frida-server on Android
adb shell "ps | grep frida"

# Restart frida-server
adb shell "su -c 'killall frida-server'"
adb shell "su -c '/data/local/tmp/frida-server &'"

# Verify connection
frida-ps -U
```

### Certificate Not Working

```bash
# Check certificate installed on Android
# Settings → Security → User certificates

# Regenerate mitmproxy certificate
rm -rf ~/.mitmproxy
mitmproxy  # Start once to regenerate
# Ctrl+C
sudo systemctl restart mitmweb
```

---

## Summary

You now have a complete analysis toolkit:

- **mitmproxy** - HTTPS interception and decryption
- **Wireshark** - Complete packet capture and analysis
- **Frida** - Dynamic app instrumentation
- **SSL bypass** - Decrypt app traffic even with pinning
- **API logging** - See all requests and responses
- **Credential capture** - Extract tokens and auth data

Use these tools together to fully analyze the TP-Link Tapo camera and app communication, API endpoints, security mechanisms, and data

Stay vigilant. Stay secure.