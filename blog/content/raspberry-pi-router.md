# Raspberry Pi Isolated WiFi Access Point Setup
## Internet via Ubuntu PC Ethernet + VPN Isolation

---

## Overview

This guide sets up a Raspberry Pi as an isolated WiFi access point that:
- Provides WiFi network for test devices (Tapo camera, Android phone)
- Gets internet from Ubuntu PC via Ethernet cable
- Routes all traffic through VPN for complete isolation from home network
- Enables traffic analysis with mitmproxy and Wireshark

**Network Flow:**
```
Internet → Ubuntu PC → Ethernet → Raspberry Pi (VPN)  → WiFi AP → Test Devices
           192.168.1.x         |       192.168.100.2              192.168.50.1
                               |
                        192.168.100.1
```

---

## Part 1: Ubuntu PC Configuration

### 1.1 Install Required Packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y iptables iptables-persistent
```

### 1.2 Enable IP Forwarding

```bash
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
```

### 1.3 Identify Network Interfaces

```bash
ip link show
```

**Note your interface names:**
- Internet interface (WiFi): Usually `wlan0`
- Ethernet to Pi: Usually `eth0`, `eth1`, or `enp0s25`

**For this guide:**
- `wlo1` = your internet interface
- `enp3s0` = ethernet connected to Pi

### 1.4 Configure Static IP for Pi Connection

- Check ethernet status
```bash 
nmcli connection show
```
- In my case the result was the below
```bash
~$   nmcli connection show
NAME                UUID                                  TYPE      DEVICE
Home_WiFi           aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee  wifi      wlo1
lo                  11111111-2222-3333-4444-555555555555  loopback  lo
Wired connection 1  66666666-7777-8888-9999-000000000000  ethernet  --
```
```bash
# Using NetworkManager (Ubuntu Desktop)
sudo nmcli connection modify "Wired connection 1" \
    ipv4.addresses 192.168.100.1/24 \
    ipv4.method manual

# Restart the connection
sudo nmcli connection down "Wired connection 1"
sudo nmcli connection up "Wired connection 1"

# Verify
ip addr show eth1
# Should show: inet 192.168.100.1/24
```

### 1.5 Configure NAT (IP Masquerading)

```bash
# Replace wlan0 and eth1 with YOUR actual interface names
sudo iptables -t nat -A POSTROUTING -o wlan0 -j MASQUERADE
sudo iptables -A FORWARD -i eth1 -o wlan0 -j ACCEPT
sudo iptables -A FORWARD -i wlan0 -o eth1 -m state --state RELATED,ESTABLISHED -j ACCEPT

# Save rules
sudo netfilter-persistent save
```

### 1.6 Verify Ubuntu PC Setup

```bash
# Check IP forwarding
sysctl net.ipv4.ip_forward
# Should be: 1

# Check ethernet has static IP
ip addr show eth1 | grep "inet "
# Should show: 192.168.100.1/24

# Check NAT rules
sudo iptables -t nat -L -n -v | grep MASQUERADE
```
- On my machine the result was below.
```bash
$ sudo iptables -t nat -L -n -v | grep MASQUERADE        
   39  2448 MASQUERADE  0    --  *      wlo1    0.0.0.0/0            0.0.0.0/0   
```
- Now you need to get the IP adress. To start with we can see if the pi is broadcasting iitself. 
```bash
$ ip neigh show dev enp3s0
```
- In my case I need to install a dhcp server 
```bash
$ sudo apt install -y dnsmasq
```
- Next create a backup of the config
```bash
sudo cp /etc/dnsmasq.conf /etc/dnsmasq.conf.backup
```
- Edit the config
```bash
sudo nano /etc/dnsmasq.d/eth-dhcp.conf
```
- Insert the below config
```
port=0
  interface=enp3s0
  dhcp-range=192.168.100.50,192.168.100.150,12h
  dhcp-option=3,192.168.100.1
  dhcp-option=6,8.8.8.8,8.8.4.4
```
- Restart and check the status
```bash
sudo systemctl restart dnsmasq
sudo systemctl status dnsmasq.service
```
- Now look at the logs for an ip address
```bash
$ sudo journalctl -u dnsmasq -f

Dec 31 16:05:21 research dnsmasq-dhcp[72624]: DHCPACK(enp3s0) 192.168.100.134 xx:xx:xx:xx:xx:xx research-pi
```
- The hostname I set was "research-pi" so the ip is 192.168.100.134.

---

## Part 2: Raspberry Pi Setup

### 2.1 Install Raspberry Pi OS

1. Download **Raspberry Pi Imager**: https://www.raspberrypi.com/software/
2. Insert microSD card
3. In Imager:
   - OS: **Raspberry Pi OS Lite (64-bit)**
   - Storage: Your SD card
   - Settings (gear icon):
     - Enable SSH
     - Set username: `pi`
     - Set password: (your choice)
     - Set hostname: `research-pi`
4. Write to SD card

### 2.2 Initial Boot and SSH

```bash
# Insert SD card into Pi, power on
# Connect monitor/keyboard OR find IP on network

# From Ubuntu PC, SSH to Pi
ssh pi@research-pi.local
# OR if .local doesn't work, find IP:
nmap -sn 192.168.1.0/24 | grep -i raspberry
ssh pi@<IP_ADDRESS>
```

### 2.3 Update System

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y vim git curl net-tools
sudo reboot
```

### 2.4 Configure Static IP on eth0

Edit `/etc/dhcpcd.conf`:

```bash
sudo nano /etc/dhcpcd.conf
```

**Add at the end:**

```
interface eth0
static ip_address=192.168.100.2/24
static routers=192.168.100.1
static domain_name_servers=192.168.100.1 8.8.8.8
```

Save (Ctrl+X, Y, Enter) and restart:

```bash
sudo systemctl restart dhcpcd
```

### 2.5 Connect to Ubuntu PC

```bash
# Physically connect Ethernet cable:
# Pi eth0 → Ubuntu PC eth1

# Wait 30 seconds, then test from Pi:
ping -c 3 192.168.100.1
# Should get replies

# Test internet through Ubuntu PC:
ping -c 3 8.8.8.8
# Should work
```

**If ping fails:**
- Check cable is connected
- Verify Ubuntu PC has IP 192.168.100.1 on eth1
- Verify iptables rules on Ubuntu PC
- Check IP forwarding enabled on Ubuntu PC

### 2.6 Enable IP Forwarding on Pi

**Critical:** IP forwarding allows the Pi to route traffic between wlan0 (WiFi clients) and eth0 (Ubuntu PC). Without this, WiFi clients won't have internet access.

```bash
# Enable IP forwarding immediately
sudo sysctl -w net.ipv4.ip_forward=1

# Make it persistent across reboots (systemd method - the proper way)
echo "net.ipv4.ip_forward=1" | sudo tee /etc/sysctl.d/99-ip-forward.conf

# Apply the configuration
sudo sysctl -p /etc/sysctl.d/99-ip-forward.conf

# Verify it's enabled
sysctl net.ipv4.ip_forward
# Should output: net.ipv4.ip_forward = 1
```

**Why use `/etc/sysctl.d/` instead of `/etc/sysctl.conf`?**
- Modern Raspberry Pi OS uses systemd and reads settings from `/etc/sysctl.d/`
- Files in `/etc/sysctl.d/` override `/etc/sysctl.conf`
- The `99-` prefix ensures this loads last, overriding any conflicting settings
- This method is guaranteed to persist across reboots

---

## Part 3: WiFi Access Point Configuration

### 3.1 Install Required Software

```bash
sudo apt install -y hostapd dnsmasq iptables-persistent

# Stop services while we configure
sudo systemctl stop hostapd
sudo systemctl stop dnsmasq
```

### 3.2 Configure wlan0 Static IP

**Note:** Different Raspberry Pi OS versions use different network managers. Check which one you have first.

#### Check Network Manager

```bash
sudo systemctl status NetworkManager
sudo systemctl status dhcpcd
```

#### Option A: If Using NetworkManager (most modern installs)

Since NetworkManager may ignore `/etc/dhcpcd.conf`, create a systemd service to ensure wlan0 gets its static IP:

```bash
sudo nano /etc/systemd/system/wlan0-static-ip.service
```

**Add:**

```ini
[Unit]
Description=Set static IP for wlan0
After=network.target
Before=hostapd.service dnsmasq.service

[Service]
Type=oneshot
ExecStart=/sbin/ip addr add 192.168.50.1/24 dev wlan0
ExecStart=/sbin/ip link set wlan0 up
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

Save and exit. Then enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable wlan0-static-ip.service
```

#### Option B: If Using dhcpcd (older installs)

Edit `/etc/dhcpcd.conf`:

```bash
sudo nano /etc/dhcpcd.conf
```

**Add at the end:**

```
interface wlan0
static ip_address=192.168.50.1/24
nohook wpa_supplicant
```

Save and exit.

### 3.3 Configure dnsmasq (DHCP/DNS Server)

```bash
# Backup original config
sudo mv /etc/dnsmasq.conf /etc/dnsmasq.conf.backup

# Create new config
sudo nano /etc/dnsmasq.conf
```

**Add:**

```
interface=wlan0
dhcp-range=192.168.50.10,192.168.50.50,255.255.255.0,24h
dhcp-option=3,192.168.50.1
dhcp-option=6,192.168.50.1
server=192.168.100.1
server=8.8.8.8
log-queries
log-dhcp
```

Save and exit.

### 3.4 Configure hostapd (WiFi AP)

Create `/etc/hostapd/hostapd.conf`:

```bash
sudo nano /etc/hostapd/hostapd.conf
```

**Add:**

```
interface=wlan0
driver=nl80211
ssid=ResearchLab
hw_mode=g
channel=6
country_code=GB
ieee80211n=1
wmm_enabled=1
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=ResearchLab2024!
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP
```

**Important:** Change `country_code=US` to your country code (GB for UK, DE for Germany, etc.)

Save and exit.

### 3.5 Enable hostapd Configuration

```bash
sudo nano /etc/default/hostapd
```

**Add/modify this line:**

```
DAEMON_CONF="/etc/hostapd/hostapd.conf"
```

Save and exit.

### 3.6 Configure Routing with iptables

```bash
# Route traffic from wlan0 (WiFi clients) to eth0 (Ubuntu PC)
sudo iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
sudo iptables -A FORWARD -i wlan0 -o eth0 -j ACCEPT
sudo iptables -A FORWARD -i eth0 -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT

# Save rules
sudo netfilter-persistent save
```

### 3.7 Unblock WiFi (rfkill) and Enable NetworkManager WiFi Radio

WiFi might be soft-blocked by rfkill on fresh installs, and NetworkManager often has the WiFi radio disabled by default. Both need to be enabled.

```bash
# Check NetworkManager WiFi radio status
nmcli radio wifi

# If it shows "disabled", enable it:
sudo nmcli radio wifi on

# Check rfkill status
sudo rfkill list

# Unblock WiFi
sudo rfkill unblock wlan

# Verify WiFi is unblocked
sudo rfkill list
```

You should see:
- `nmcli radio wifi` returns `enabled`
- `Soft blocked: no` for the WLAN device in rfkill list

**Make WiFi unblocking persistent across reboots:**

Create a systemd service to automatically enable WiFi on every boot:

```bash
sudo nano /etc/systemd/system/rfkill-unblock-wifi.service
```

**Add:**

```ini
[Unit]
Description=Unblock WiFi rfkill on boot
After=NetworkManager.service
Before=hostapd.service

[Service]
Type=oneshot
ExecStart=/usr/bin/nmcli radio wifi on
ExecStart=/usr/sbin/rfkill unblock wlan
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

Save and exit. Then enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable rfkill-unblock-wifi.service
```

This ensures that both NetworkManager's WiFi radio and rfkill are enabled before hostapd starts on every boot.

### 3.8 Enable and Start Services

```bash
sudo systemctl unmask hostapd
sudo systemctl enable hostapd
sudo systemctl enable dnsmasq
sudo systemctl start hostapd
sudo systemctl start dnsmasq
```

### 3.9 Check Service Status

```bash
sudo systemctl status hostapd
sudo systemctl status dnsmasq
```

**Expected output for hostapd:**
- `Active: active (running)` in green
- `wlan0: AP-ENABLED`
- `interface state ENABLED`

**Expected output for dnsmasq:**
- `Active: active (running)` in green
- `DHCP, IP range 192.168.50.10 -- 192.168.50.50`

### 3.10 Verify Configuration (Before Reboot)

**Critical check - wlan0 must have an IP address:**

```bash
# Check wlan0 has the static IP
ip addr show wlan0 | grep "inet "
```

**Expected output:** `inet 192.168.50.1/24`

**If wlan0 has NO IP address**, manually assign it before rebooting:

```bash
sudo ip addr add 192.168.50.1/24 dev wlan0
sudo systemctl restart dnsmasq
sudo systemctl restart hostapd
```

Then verify services again.

### 3.11 Test WiFi Connection

Before rebooting, test the WiFi AP:

```bash
# Monitor DHCP activity
sudo journalctl -u dnsmasq -f
```

From another device:
1. Look for the WiFi network "ResearchLab" (or your chosen SSID)
2. Connect using the password from step 3.4
3. Check if you get an IP in the range 192.168.50.10-50
4. Test internet connectivity by browsing a website

You should see DHCP activity in the logs showing:
- `DHCPDISCOVER`
- `DHCPOFFER`
- `DHCPREQUEST`
- `DHCPACK`

Press Ctrl+C to stop monitoring.

### 3.12 Reboot Pi

Once everything is working:

```bash
sudo reboot
```

### 3.13 Post-Reboot Verification

After the Pi reboots, SSH back in and verify everything is still working:

```bash
# Check wlan0 has the IP address
ip addr show wlan0 | grep "inet "
# Should show: inet 192.168.50.1/24

# Check IP forwarding is enabled (CRITICAL)
sysctl net.ipv4.ip_forward
# Should show: net.ipv4.ip_forward = 1

# Check hostapd is running
sudo systemctl status hostapd
# Should show: Active: active (running) and AP-ENABLED

# Check dnsmasq is running
sudo systemctl status dnsmasq
# Should show: Active: active (running)

# Verify WiFi clients can connect
sudo journalctl -u dnsmasq -n 50 | grep DHCP
```

**Critical checks:**
- ✓ wlan0 has IP `192.168.50.1/24`
- ✓ **IP forwarding = 1** (if this is 0, WiFi clients won't have internet!)
- ✓ hostapd shows `AP-ENABLED`
- ✓ dnsmasq is running

---

## Part 4: Testing the Setup

### 4.1 Connect to WiFi

From your phone or laptop:
1. Search for WiFi networks
2. Connect to: **ResearchLab**
3. Password: **ResearchLab2024!**
4. You should get IP: 192.168.50.x (e.g., 192.168.50.15)

### 4.2 Test Internet Connection

From connected device:
```bash
ping 8.8.8.8
# Should work

# Check your public IP
curl ifconfig.me
# Should show your VPN provider's IP, NOT your home IP
```

### 4.3 Verify Isolation

Your research network is now completely isolated:
- Traffic goes: Device → Pi → Ubuntu PC → VPN → Internet
- Your home router never sees the research traffic
- Research devices cannot access your home network

---

## Part 5: ProtonVPN Configuration on Raspberry Pi

This guide uses **ProtonVPN with WireGuard** for maximum performance and reliability.

### 5.1 Get ProtonVPN WireGuard Configuration

**On your Ubuntu PC:**

1. Log into your ProtonVPN account at https://account.protonvpn.com
2. Go to **Downloads** → **WireGuard configuration**
3. Select your desired server location (e.g., UK, US, etc.)
4. Download the configuration file (e.g., `pi-UK-713.conf`)

### 5.2 Install WireGuard on Raspberry Pi

**SSH into the Pi and install required packages:**

```bash
# Install WireGuard and resolvconf (needed for DNS management)
sudo apt install -y wireguard wireguard-tools resolvconf

# Create WireGuard config directory
sudo mkdir -p /etc/wireguard
```

### 5.3 Transfer ProtonVPN Config to Pi

**From your Ubuntu PC:**

```bash
# Copy the ProtonVPN config file to the Pi
scp ~/Downloads/pi-UK-713.conf dev@192.168.100.134:/tmp/
```

**On the Raspberry Pi:**

```bash
# Move config to WireGuard directory and rename to wg0.conf
sudo mv /tmp/pi-UK-713.conf /etc/wireguard/wg0.conf

# Set secure permissions
sudo chmod 600 /etc/wireguard/wg0.conf
```

### 5.4 Add Killswitch and Routing Rules

The killswitch ensures WiFi clients have NO internet if the VPN connection drops - preventing any data leaks.

**Edit the WireGuard config:**

```bash
sudo nano /etc/wireguard/wg0.conf
```

**Add these lines in the `[Interface]` section** (after the `DNS` line):

```ini
PostUp = iptables -D FORWARD -i wlan0 -j DROP; iptables -t nat -A POSTROUTING -o wg0 -j MASQUERADE; iptables -A FORWARD -i wlan0 -o wg0 -j ACCEPT; iptables -A FORWARD -i wg0 -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT
PreDown = iptables -t nat -D POSTROUTING -o wg0 -j MASQUERADE; iptables -D FORWARD -i wlan0 -o wg0 -j ACCEPT; iptables -D FORWARD -i wg0 -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT; iptables -I FORWARD 1 -i wlan0 -j DROP
```

**Your config should look like this:**

```ini
[Interface]
# ProtonVPN config details
PrivateKey = YOUR_PRIVATE_KEY_HERE
Address = 10.2.0.2/32
DNS = 10.2.0.1
PostUp = iptables -D FORWARD -i wlan0 -j DROP; iptables -t nat -A POSTROUTING -o wg0 -j MASQUERADE; iptables -A FORWARD -i wlan0 -o wg0 -j ACCEPT; iptables -A FORWARD -i wg0 -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT
PreDown = iptables -t nat -D POSTROUTING -o wg0 -j MASQUERADE; iptables -D FORWARD -i wlan0 -o wg0 -j ACCEPT; iptables -D FORWARD -i wg0 -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT; iptables -I FORWARD 1 -i wlan0 -j DROP

[Peer]
# ProtonVPN Server
PublicKey = SERVER_PUBLIC_KEY_HERE
AllowedIPs = 0.0.0.0/0, ::/0
Endpoint = 186.134.187.2:51820
```
- cCnfig will chnage dependig on vpn config

Save and exit (Ctrl+X, Y, Enter)

### 5.5 Set Up Killswitch Default Rule

Create a persistent DROP rule for WiFi traffic (killswitch default state):

```bash
# Remove any old eth0 MASQUERADE rules
sudo iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE 2>/dev/null || true

# Add default DROP rule for WiFi (killswitch when VPN is down)
sudo iptables -I FORWARD 1 -i wlan0 -j DROP

# Save these rules
sudo netfilter-persistent save
```

**Important:** Your phone will have NO INTERNET now (killswitch is active). This is correct! The VPN will remove this rule when it starts.

### 5.6 Start VPN and Enable on Boot

```bash
# Start ProtonVPN via systemd
sudo systemctl start wg-quick@wg0

# Check status - should show "active (exited)"
sudo systemctl status wg-quick@wg0

# Verify VPN is connected
sudo wg show
# Should show: latest handshake, transfer stats

# Check your public IP from the Pi
curl ifconfig.me
# Should show ProtonVPN IP (not your home IP)

# Enable VPN to start automatically on boot
sudo systemctl enable wg-quick@wg0
```

**Your phone should have internet again now** (routed through ProtonVPN).

### 5.7 Test the VPN and Killswitch

**Test VPN is working:**

From your phone connected to ResearchLab WiFi:
1. Visit https://ipleak.net
2. Verify:
   - IP shows ProtonVPN server IP
   - DNS shows ProtonVPN DNS (10.2.0.1)
   - No DNS or WebRTC leaks
3. Try browsing - should work normally

**Test killswitch (CRITICAL):**

On the Raspberry Pi:
```bash
# Stop the VPN
sudo systemctl stop wg-quick@wg0
```

On your phone:
- Try to browse or use any app
- You should have **NO INTERNET** (killswitch working!)
- This proves no data can leak outside the VPN

Restart VPN on the Pi:
```bash
# Start VPN again
sudo systemctl start wg-quick@wg0
```

Phone should have internet again through ProtonVPN

### 5.8 Reboot and Final Verification

**Test that everything persists across reboot:**

```bash
sudo reboot
```

**Wait 60-90 seconds for the Pi to boot** (the VPN takes a moment to establish connection).

**After reboot, SSH back into the Pi:**

```bash
ssh dev@192.168.100.134
```

**Verify ProtonVPN started automatically:**

```bash
# Check VPN service is running
sudo systemctl status wg-quick@wg0
# Should show: Active: active (exited)

# Check VPN connection details
sudo wg show
# Should show:
#   - interface: wg0
#   - latest handshake: <recent time>
#   - transfer: <data stats>

# Check public IP from Pi
curl ifconfig.me
# Should show ProtonVPN IP (e.g., 185.130.187.22)

# Verify killswitch DROP rule exists
sudo iptables -L FORWARD -n -v | grep DROP
# Should show: DROP all -- wlan0 *
```

**Test from your phone:**

1. Connect to **ResearchLab** WiFi
2. Visit https://ipleak.net
3. Verify:
   - ✓ IP address shows ProtonVPN server IP
   - ✓ DNS shows ProtonVPN DNS (10.2.0.1)
   - ✓ No DNS leaks
   - ✓ No WebRTC leaks
4. Try browsing - should work normally

**Final killswitch test:**

```bash
# On Pi: Stop VPN
sudo systemctl stop wg-quick@wg0

# On phone: Should have NO INTERNET

# On Pi: Start VPN
sudo systemctl start wg-quick@wg0

# On phone: Internet works again
```

### 5.9 ProtonVPN Automatic Reconnection

**Good news:** WireGuard with systemd automatically handles reconnection!

- If the VPN connection drops temporarily, WireGuard will automatically re-establish the handshake
- If the Pi reboots, systemd starts the VPN automatically (because we enabled `wg-quick@wg0.service`)
- The killswitch ensures no data leaks during any disconnection

No additional watchdog script is needed - systemd manages the service lifecycle

---

## ProtonVPN Troubleshooting

### Issue: VPN not working - "resolvconf: command not found"

**Cause:** `resolvconf` package is missing (needed for DNS management).

**Solution:**
```bash
sudo apt install -y resolvconf
sudo systemctl restart wg-quick@wg0
```

### Issue: Phone has internet when VPN is stopped (killswitch not working)

**Cause:** Old iptables rules allowing eth0 traffic or killswitch DROP rule missing.

**Solution:**
```bash
# Check if there are old eth0 rules
sudo iptables -L FORWARD -n -v | grep eth0

# If you see wlan0 <-> eth0 rules, delete them
sudo iptables -D FORWARD <line_number>

# Ensure DROP rule exists
sudo iptables -L FORWARD -n -v | grep DROP
# If missing, add it:
sudo iptables -I FORWARD 1 -i wlan0 -j DROP

# Save
sudo netfilter-persistent save

# Restart VPN
sudo systemctl restart wg-quick@wg0
```

### Issue: VPN doesn't start on boot

**Solution:**
```bash
# Check if service is enabled
sudo systemctl is-enabled wg-quick@wg0

# If not enabled:
sudo systemctl enable wg-quick@wg0

# Check for errors
sudo journalctl -u wg-quick@wg0 -n 50
```

### Issue: Check ProtonVPN connection status

```bash
# View VPN connection details
sudo wg show

# Check handshake time (should be recent)
# Check transfer stats (should be increasing)

# Test public IP
curl ifconfig.me

# Check iptables routing
sudo iptables -L FORWARD -n -v | grep wg0
sudo iptables -t nat -L -n -v | grep wg0
```

---

## General Troubleshooting

### Issue: wlan0 has no IP after reboot

**Solution:**
```bash
# If using NetworkManager, ensure the systemd service is enabled
sudo systemctl status wlan0-static-ip.service
sudo systemctl enable wlan0-static-ip.service
sudo systemctl start wlan0-static-ip.service

# Verify wlan0 has IP
ip addr show wlan0 | grep "inet "
```

### Issue: hostapd shows "rfkill: WLAN soft blocked"

**Cause:** WiFi is blocked by rfkill or NetworkManager has WiFi radio disabled.

**Solution:**
```bash
# Check NetworkManager WiFi radio
nmcli radio wifi
# If it shows "disabled":
sudo nmcli radio wifi on

# Unblock rfkill
sudo rfkill unblock wlan

# Restart hostapd
sudo systemctl restart hostapd
sudo systemctl status hostapd
```

**Make it permanent:** Ensure the `rfkill-unblock-wifi.service` is enabled (see section 3.7).

### Issue: Clients connect but get "DHCP packet received on wlan0 which has no address"

**Cause:** wlan0 doesn't have the static IP assigned.

**Solution:**
```bash
sudo ip addr add 192.168.50.1/24 dev wlan0
sudo systemctl restart dnsmasq
sudo systemctl restart hostapd

# Verify
ip addr show wlan0 | grep "inet "
```

### Issue: Clients connect and get IP but "No Internet" or can't browse

**Cause:** IP forwarding is disabled on the Pi. This prevents traffic from being routed between wlan0 (WiFi) and eth0 (internet).

**Solution:**
```bash
# Check IP forwarding status
sysctl net.ipv4.ip_forward
# If it shows "net.ipv4.ip_forward = 0", it's disabled

# Enable IP forwarding immediately
sudo sysctl -w net.ipv4.ip_forward=1

# Make it persistent across reboots (use systemd method)
echo "net.ipv4.ip_forward=1" | sudo tee /etc/sysctl.d/99-ip-forward.conf

# Apply the configuration
sudo sysctl -p /etc/sysctl.d/99-ip-forward.conf

# Verify it's enabled
sysctl net.ipv4.ip_forward
# Should show: net.ipv4.ip_forward = 1
```

**Test from your phone:** Internet should work immediately after enabling IP forwarding.

**Note:** If you previously added `net.ipv4.ip_forward=1` to `/etc/sysctl.conf` but it doesn't persist after reboot, that's because modern Raspberry Pi OS uses systemd and prioritizes `/etc/sysctl.d/` files. Use the method above with `/etc/sysctl.d/99-ip-forward.conf` for guaranteed persistence.

### WiFi AP Not Showing

```bash
# Check hostapd status
sudo systemctl status hostapd

# Check for errors
sudo journalctl -u hostapd -n 50

# Check NetworkManager WiFi radio
nmcli radio wifi
# If disabled, enable it:
sudo nmcli radio wifi on

# Verify wlan0 is not blocked
sudo rfkill list
# If blocked, unblock:
sudo rfkill unblock wlan

# Restart hostapd
sudo systemctl restart hostapd

# Verify wlan0 is UP and has IP
ip addr show wlan0
```

### No Internet on Connected Devices

**First, check IP forwarding on the Pi (most common cause):**

```bash
# On Pi, check IP forwarding
sysctl net.ipv4.ip_forward
# Should be 1

# If it's 0, enable it:
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee /etc/sysctl.d/99-ip-forward.conf
sudo sysctl -p /etc/sysctl.d/99-ip-forward.conf

# Test internet from phone immediately - it should work now
```

**If IP forwarding is enabled (= 1) but still no internet:**

```bash
# Check iptables rules on Pi
sudo iptables -t nat -L -n -v
sudo iptables -L FORWARD -n -v

# Test connectivity from Pi
ping 192.168.100.1  # Ubuntu PC
ping 8.8.8.8         # Internet

# On Ubuntu PC, check IP forwarding
sysctl net.ipv4.ip_forward
# Should be 1

# Check NAT rules on Ubuntu PC
sudo iptables -t nat -L -n -v
```

### Devices Get IP but No Internet

```bash
# Check DNS
# From connected device, try:
ping 8.8.8.8  # Works?
ping google.com  # Doesn't work?

# If yes/no, it's a DNS issue
# On Pi, check dnsmasq
sudo systemctl status dnsmasq

# Restart dnsmasq
sudo systemctl restart dnsmasq
```

### VPN Not Working

```bash
# Check VPN status
# OpenVPN:
sudo systemctl status openvpn@your-vpn

# WireGuard:
sudo wg show

# Check VPN interface exists
ip addr show tun0  # OpenVPN
ip addr show wg0   # WireGuard

# Test VPN connection
curl ifconfig.me
# Should show VPN IP
```

---

## Network Diagram

```
┌─────────────────────────────────────────────┐
│              Internet                        │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         Ubuntu PC (192.168.100.1)            │
│  ┌──────────────────────────────────────┐   │
│  │ wlan0: DHCP from home router         │   │
│  │ eth1: 192.168.100.1/24 (to Pi)       │   │
│  │ NAT: Forward eth1 ↔ wlan0            │   │
│  └──────────────────────────────────────┘   │
└──────────────────┬──────────────────────────┘
                   │ Ethernet Cable
                   │
┌──────────────────▼──────────────────────────┐
│       Raspberry Pi (192.168.100.2)           │
│  ┌──────────────────────────────────────┐   │
│  │ eth0: 192.168.100.2/24 (from PC)     │   │
│  │ wlan0: 192.168.50.1/24 (WiFi AP)     │   │
│  │ tun0/wg0: VPN Interface               │   │
│  │                                       │   │
│  │ Services:                             │   │
│  │  - hostapd (WiFi AP)                 │   │
│  │  - dnsmasq (DHCP: .10-.50)           │   │
│  │  - OpenVPN/WireGuard (VPN)           │   │
│  │                                       │   │
│  │ Traffic Flow:                         │   │
│  │  wlan0 → tun0/wg0 → eth0 → Internet  │   │
│  │         (VPN encrypted)               │   │
│  └──────────────────────────────────────┘   │
└──────────────────┬──────────────────────────┘
                   │ WiFi: ResearchLab
                   │ 192.168.50.0/24
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌───────▼────────┐
│ Android Phone  │   │  Test Devices  │
│ 192.168.50.15  │   │ 192.168.50.20  │
└────────────────┘   └────────────────┘
```

---

## Quick Reference Commands

### Restart WiFi AP
```bash
sudo systemctl restart hostapd dnsmasq
```

### Check Connected Devices
```bash
# View DHCP leases
cat /var/lib/misc/dnsmasq.leases

# View active connections
sudo iw dev wlan0 station dump
```

### View Logs
```bash
# hostapd logs
sudo journalctl -u hostapd -f

# dnsmasq logs
sudo journalctl -u dnsmasq -f
```

### Check Traffic
```bash
# Real-time traffic on wlan0
sudo iftop -i wlan0

# Connection stats
sudo netstat -tunlp
```

---

## Summary

You now have:
- Raspberry Pi WiFi Access Point (SSID: ResearchLab)
- Internet via Ubuntu PC Ethernet connection
- VPN running on Raspberry Pi (all traffic encrypted and isolated)
- Complete isolation from home network
- DHCP serving IPs: 192.168.50.10 - 192.168.50.50
- VPN killswitch prevents traffic leaks
- Automatic VPN reconnection
- Ready for mitmproxy, Wireshark, and Frida analysis

**Boot Sequence (Automatic on every reboot):**
1. `rfkill-unblock-wifi.service` - Enables NetworkManager WiFi radio and unblocks rfkill
2. `wlan0-static-ip.service` - Assigns static IP 192.168.50.1/24 to wlan0
3. `hostapd.service` - Creates WiFi access point on wlan0
4. `dnsmasq.service` - Provides DHCP to WiFi clients (192.168.50.10-50)

**Traffic Flow:**
```
Device → Pi WiFi → VPN (tun0/wg0) → Ubuntu PC → Internet
         192.168.50.x    (encrypted)      192.168.100.1
```

**Next Steps:**
- Connect your Android phone and test devices to ResearchLab WiFi
- Install mitmproxy for HTTPS interception (separate guide)
- Install Wireshark for packet capture
- Set up Frida for Android app analysis

---

Stay vigilant. Stay secure.