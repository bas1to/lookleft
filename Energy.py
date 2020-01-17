import Jetson.GPIO as GPIO
import time

GPIO.setmode(GPIO.BOARD)
GPIO.setup(31, GPIO.OUT)

# set pin to high
GPIO.output(31, GPIO.HIGH)
# let pin be high for 1 sec
time.sleep(1)
# set pin to low
GPIO.output(31, GPIO.LOW)
