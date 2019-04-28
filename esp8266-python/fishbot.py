import ujson
import network
import time
from machine import Pin
import onewire
import ds18x20
import urequeststimeout as urequests
import math

# Set up LEDs and Button
redLED = Pin(5, Pin.OUT)
greenLED = Pin(4, Pin.OUT)
button = Pin(2, Pin.IN, Pin.PULL_UP)

# Load and configure Wifi
with open('fishbot.json') as configJson:
    config = ujson.load(configJson)
sta_if = network.WLAN(network.STA_IF)

# HTTP Headers for Knodge
headers = {}
headers['x-knodge-user'] = config['knodge_user_key']
headers['x-knodge-thing'] = config['knodge_thing_key']
headers['Content-type'] = 'application/json'

# Set up temp sensor on 0
ow = onewire.OneWire(Pin(0))
ds = ds18x20.DS18X20(ow)
roms = []
# Sometimes the code doesn't see the sensor first time
while len(roms) is 0:
    roms = ds.scan()
rom = roms[0]


# Connect to wifi
def connectToWifi():

    if sta_if.isconnected() is False:
        print('Not connected')
        redLED.on()
        greenLED.off()
        if sta_if.active() is False:
            print('Activating interface')
            staf_if.active(True)
        print('Connecting to ' + config['ssid'])
        sta_if.connect(config['ssid'], config['psk'])
        while True:
            print('Checking connection')
            time.sleep(1)
            if sta_if.isconnected():
                print('Connected to Wifi')
                redLED.off()
                greenLED.on()
                break
    else:
        greenLED.on()
        print('Connected to Wifi')


# Read and send the temperature
def takeTemp():
    connectToWifi()

    ds.convert_temp()
    time.sleep_ms(750)
    temp = ds.read_temp(rom)
    print(temp)

    json = {"temp": temp, "metric": "c", "psk": config['fishbotpsk']}

    print('Sending')
    redLED.on()
    try:
        response = urequests.put(config['target'], headers=headers, json=json,
                                 timeout=20)
    except:
        print('HTTP error')
    redLED.off()

# Loop forever
waited = 0
while True:

    if waited == 0 or math.floor(waited) >= config['interval']:
        waited = 0
        takeTemp()
        print('Waiting ' + str(config['interval']) + ' seconds')
    elif button.value() == 0:
        print('Button press')
        takeTemp()

    time.sleep_ms(100)
    waited += 0.1
