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
Internet → Ubuntu PC (VPN) → Ethernet → Raspberry Pi → WiFi AP → Test Devices
           192.168.1.x         |        192.168.100.2   192.168.50.1
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
- `wlan0` = your internet interface
- `eth1` = ethernet connected to Pi

### 1.4 Configure Static IP for Pi Connection

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

```bash
sudo sysctl -w net.ipv4.ip_forward=1
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
```

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
ssid=TapoResearchLab
hw_mode=g
channel=6
country_code=US
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

### 3.7 Enable and Start Services

```bash
sudo systemctl unmask hostapd
sudo systemctl enable hostapd
sudo systemctl enable dnsmasq
sudo systemctl start hostapd
sudo systemctl start dnsmasq
```

### 3.8 Check Service Status

```bash
sudo systemctl status hostapd
sudo systemctl status dnsmasq
```

Both should show "active (running)" in green.

### 3.9 Reboot Pi

```bash
sudo reboot
```

---

## Part 4: Testing the Setup

### 4.1 Connect to WiFi

From your phone or laptop:
1. Search for WiFi networks
2. Connect to: **TapoResearchLab**
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

## Part 5: VPN Configuration on Raspberry Pi

### 5.1 Install VPN Client on Pi

**Option A: OpenVPN**

```bash
sudo apt install -y openvpn

# Copy your .ovpn file from Ubuntu PC to Pi
# From Ubuntu PC:
scp ~/vpn-configs/your-vpn.ovpn pi@192.168.100.2:/home/pi/

# Or create the file directly on Pi
# sudo nano /home/pi/your-vpn.ovpn
# Paste your VPN config and save
```

**Test OpenVPN connection:**
```bash
sudo openvpn --config /home/pi/your-vpn.ovpn
# You should see "Initialization Sequence Completed"
# Press Ctrl+C to stop
```

**Option B: WireGuard (Recommended - Faster & More Reliable)**

```bash
sudo apt install -y wireguard wireguard-tools

# Create WireGuard config directory
sudo mkdir -p /etc/wireguard

# Copy your .conf file from Ubuntu PC
# From Ubuntu PC:
scp ~/Downloads/wg0.conf pi@192.168.100.2:/tmp/
# Then on Pi:
sudo mv /tmp/wg0.conf /etc/wireguard/
sudo chmod 600 /etc/wireguard/wg0.conf

# Or create the file directly on Pi
sudo nano /etc/wireguard/wg0.conf
# Paste your WireGuard config:
```

**Example WireGuard config structure:**
```ini
[Interface]
PrivateKey = YOUR_PRIVATE_KEY_HERE
Address = 10.x.x.x/32
DNS = 1.1.1.1

[Peer]
PublicKey = SERVER_PUBLIC_KEY_HERE
Endpoint = vpn.provider.com:51820
AllowedIPs = 0.0.0.0/0
```

**Test WireGuard connection:**
```bash
sudo wg-quick up wg0
# Should see "interface wg0 is up"

# Verify connection
sudo wg show
# Should show handshake information

# Check VPN IP
curl ifconfig.me
# Should show VPN provider's IP

# Stop VPN for now
sudo wg-quick down wg0
```

### 5.2 Update iptables to Route Through VPN

**First, determine your VPN interface:**
- OpenVPN: `tun0`
- WireGuard: `wg0`

**Remove the old routing rule (through eth0):**
```bash
sudo iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
```

**Add VPN routing rules:**

For **OpenVPN (tun0)**:
```bash
sudo iptables -t nat -A POSTROUTING -o tun0 -j MASQUERADE
sudo iptables -A FORWARD -i wlan0 -o tun0 -j ACCEPT
sudo iptables -A FORWARD -i tun0 -o wlan0 -m state --state RELATED,ESTABLISHED -j ACCEPT

# Allow VPN traffic to go through eth0 (to Ubuntu PC)
sudo iptables -A FORWARD -i eth0 -o tun0 -j ACCEPT
sudo iptables -A FORWARD -i tun0 -o eth0 -m state --state RELATED,ESTABLISHED -j ACCEPT
```

For **WireGuard (wg0)**:
```bash
sudo iptables -t nat -A POSTROUTING -o wg0 -j MASQUERADE
sudo iptables -A FORWARD -i wlan0 -o wg0 -j ACCEPT
sudo iptables -A FORWARD -i wlan0 -o wg0 -m state --state RELATED,ESTABLISHED -j ACCEPT

# Allow VPN traffic to go through eth0 (to Ubuntu PC)
sudo iptables -A FORWARD -i eth0 -o wg0 -j ACCEPT
sudo iptables -A FORWARD -i wg0 -o eth0 -m state --state RELATED,ESTABLISHED -j ACCEPT
```

**Save iptables rules:**
```bash
sudo netfilter-persistent save
```

### 5.3 Enable VPN to Start on Boot

**For OpenVPN:**

```bash
# Enable the service (replace 'your-vpn' with your config filename without .ovpn)
# If your file is /home/pi/mullvad.ovpn, use:
sudo systemctl enable openvpn@mullvad
sudo systemctl start openvpn@mullvad

# Check status
sudo systemctl status openvpn@mullvad
```

**For WireGuard:**

```bash
sudo systemctl enable wg-quick@wg0
sudo systemctl start wg-quick@wg0

# Check status
sudo systemctl status wg-quick@wg0
```

### 5.4 Create VPN Killswitch (Optional but Recommended)

This ensures no traffic leaks if VPN disconnects.

**For OpenVPN:**

Create `/etc/openvpn/update-resolv-conf`:
```bash
sudo nano /etc/openvpn/update-resolv-conf
```

Add to your OpenVPN config:
```
script-security 2
up /etc/openvpn/update-resolv-conf
down /etc/openvpn/update-resolv-conf
```

**For WireGuard:**

Add to `/etc/wireguard/wg0.conf` in the `[Interface]` section:
```ini
PostUp = iptables -I FORWARD -i wlan0 ! -o wg0 -j REJECT
PreDown = iptables -D FORWARD -i wlan0 ! -o wg0 -j REJECT
```

This blocks WiFi traffic if it's not going through the VPN.

### 5.5 Verify VPN is Working

**Start the VPN:**
```bash
# OpenVPN:
sudo systemctl start openvpn@your-vpn

# WireGuard:
sudo wg-quick up wg0
```

**Check VPN interface exists:**
```bash
ip addr show tun0  # OpenVPN
# OR
ip addr show wg0   # WireGuard

# Should show the VPN interface with an IP address
```

**Test from Raspberry Pi:**
```bash
# Check public IP
curl ifconfig.me
# Should show VPN provider's IP, NOT your home IP

# Test DNS
nslookup google.com
```

**Test from connected device:**
1. Connect your phone/laptop to TapoResearchLab WiFi
2. Open browser, go to: https://ipleak.net
3. Verify:
   - IP address shows VPN provider's IP
   - No DNS leaks (should show VPN DNS)
   - No WebRTC leaks

### 5.6 Automatic VPN Reconnection

Create a watchdog script to ensure VPN stays connected.

Create `/home/pi/vpn-watchdog.sh`:
```bash
#!/bin/bash

# For OpenVPN
VPN_INTERFACE="tun0"
# For WireGuard, use:
# VPN_INTERFACE="wg0"

# Check if VPN interface exists
if ! ip link show $VPN_INTERFACE &> /dev/null; then
    echo "[$(date)] VPN down, restarting..."
    
    # For OpenVPN:
    sudo systemctl restart openvpn@your-vpn
    
    # For WireGuard:
    # sudo wg-quick down wg0
    # sudo wg-quick up wg0
    
    sleep 10
fi

# Test connectivity through VPN
if ! ping -c 1 -W 5 -I $VPN_INTERFACE 8.8.8.8 &> /dev/null; then
    echo "[$(date)] VPN not routing traffic, restarting..."
    
    # For OpenVPN:
    sudo systemctl restart openvpn@your-vpn
    
    # For WireGuard:
    # sudo wg-quick down wg0
    # sudo wg-quick up wg0
fi
```

Make executable:
```bash
chmod +x /home/pi/vpn-watchdog.sh
```

Add to crontab (runs every 5 minutes):
```bash
crontab -e
# Add this line:
*/5 * * * * /home/pi/vpn-watchdog.sh >> /home/pi/vpn-watchdog.log 2>&1
```

### 5.7 Reboot and Final Test

```bash
sudo reboot
```

After reboot:

**On Raspberry Pi:**
```bash
# Check VPN is running
sudo systemctl status openvpn@your-vpn  # OpenVPN
sudo wg show  # WireGuard

# Check public IP
curl ifconfig.me
# Should show VPN IP
```

**From connected device:**
1. Connect to TapoResearchLab WiFi
2. Visit https://ipleak.net
3. Confirm VPN IP is shown
4. Test: `curl ifconfig.me` or visit whatismyip.com

---

## Troubleshooting

### WiFi AP Not Showing

```bash
# Check hostapd status
sudo systemctl status hostapd

# Check for errors
sudo journalctl -u hostapd -n 50

# Verify wlan0 is not blocked
sudo rfkill list
# If blocked, unblock:
sudo rfkill unblock wifi

# Restart hostapd
sudo systemctl restart hostapd
```

### No Internet on Connected Devices

```bash
# On Pi, check IP forwarding
sysctl net.ipv4.ip_forward
# Should be 1

# Check iptables rules
sudo iptables -t nat -L -n -v
sudo iptables -L FORWARD -n -v

# Test from Pi
ping 192.168.100.1  # Ubuntu PC
ping 8.8.8.8         # Internet

# On Ubuntu PC, check IP forwarding
sysctl net.ipv4.ip_forward
# Should be 1

# Check NAT rules
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
                   │ WiFi: TapoResearchLab
                   │ 192.168.50.0/24
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌───────▼────────┐
│ Android Phone  │   │  Tapo Camera   │
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
- Raspberry Pi WiFi Access Point (SSID: TapoResearchLab)
- Internet via Ubuntu PC Ethernet connection
- VPN running on Raspberry Pi (all traffic encrypted and isolated)
- Complete isolation from home network
- DHCP serving IPs: 192.168.50.10 - 192.168.50.50
- VPN killswitch prevents traffic leaks
- Automatic VPN reconnection
- Ready for mitmproxy, Wireshark, and Frida analysis

**Traffic Flow:**
```
Device → Pi WiFi → VPN (tun0/wg0) → Ubuntu PC → Internet
         192.168.50.x    (encrypted)      192.168.100.1
```

**Next Steps:**
- Connect your Android phone and Tapo camera to TapoResearchLab WiFi
- Install mitmproxy for HTTPS interception (separate guide)
- Install Wireshark for packet capture
- Set up Frida for Android app analysis

Stay vigilant. Stay secure.