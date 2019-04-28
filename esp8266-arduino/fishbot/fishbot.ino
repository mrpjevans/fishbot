#include <OneWire.h>
#include <DallasTemperature.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266WiFi.h>
#include "Credentials.h"

// How many seconds between checks?
const int interval = 900;
float timer = interval * 1000;

// Inputs and Outputs
const int RED_LED = 5;
const int GREEN_LED = 4;
const int BUTTON = 2;

// Track the button press
int buttonState;

// Connect to T'Internet
void connect() {

  if (WiFi.status() != WL_CONNECTED) {

    digitalWrite(GREEN_LED, LOW);
    digitalWrite(RED_LED, HIGH);
    WiFi.begin(ssid, password);

    while (WiFi.status() != WL_CONNECTED) {

      delay(500);
      Serial.println("Waiting for connection");

    }
    digitalWrite(RED_LED, LOW);
    digitalWrite(GREEN_LED, HIGH);
  
  }
 
}

// Basic setup
void setup() {
  Serial.begin(115200);
  pinMode(RED_LED, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(BUTTON, INPUT);
}

// Main loop
void loop() {

  // Button pressed?
  buttonState = digitalRead(BUTTON);

  // If it's time to read or the button is pressed
  if (timer >= interval || buttonState == 0) {

    // Check Internet connection
    connect();

    // Setup
    HTTPClient http;
    OneWire oneWire(0);
    DallasTemperature sensors(&oneWire);
    sensors.begin();

    // RED LIGHT!
    digitalWrite(RED_LED, HIGH);

    // Prepare envelope
    http.begin(target);
    http.addHeader("x-knodge-user", knodge_user_key);
    http.addHeader("x-knodge-thing", knodge_thing_key);
    http.addHeader("Content-Type", "application/json");

    // Get a temperature reading
    sensors.requestTemperatures();
    float temp = sensors.getTempCByIndex(0);

    // Construct JSON payload
    String payload = "{\"temp\": " + String(temp) + ", \"metric\": \"c\", \"psk\": \"" + pskey + "\"}";
    Serial.println(payload);

    // PUT!
    int httpResponseCode = http.PUT(payload);

    // Consider response
    if (httpResponseCode > 0) {
   
      String response = http.getString();   
   
      Serial.println(httpResponseCode);
      Serial.println(response);
      digitalWrite(RED_LED, LOW);     
   
    } else {
  
      Serial.print("Error on sending PUT Request: ");
      Serial.println(httpResponseCode);
   
    }
   
    http.end();

    // Restrat loop
    Serial.println("Waiting " + String(interval) + " seconds");
    timer = 0;

  }

  // Wait for a bit
  delay(100);
  timer += 0.1;
  
}


