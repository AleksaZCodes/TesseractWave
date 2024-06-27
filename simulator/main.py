import serial
import time

# Available channels with the according pins and labels
pin_labels = ["A0", "A1", "A2", "A3", "A4", "A5"]
num_channels = len(pin_labels)
used_channels = [1, 0, 0, 0, 0, 0]
sampling = False
sampling_rate = 100
num_used_channels = sum(used_channels)

def send_info(ser):
    info = f"{num_channels},{sampling_rate}," + ",".join(pin_labels) + "," + ",".join(map(str, used_channels))
    ser.write(info.encode() + b'\n')

def parse_settings_command(command):
    global sampling, sampling_rate, used_channels, num_used_channels
    parts = command.strip().split(',')
    sampling = (parts[0][1] == '1')
    sampling_rate = int(parts[1])
    used_channels = [int(x) for x in parts[2]]
    num_used_channels = sum(used_channels)
    print(sampling, sampling_rate, used_channels, num_used_channels, sep='  ')
    ser.write(b"OK\r\n")

def sample(ser):
    values = [(i + 1)*1000/num_channels for i in range(num_channels) if used_channels[i] == 1]
    ser.write((','.join(map(str, values)) + '\r\n').encode())
    time.sleep(1 / sampling_rate)

# Open the virtual serial port
ser = serial.Serial('COM15', 115200, timeout=1)

ser.write(b"READY\r\n")
print('sent "READY"')

try:
    while True:
        if ser.in_waiting > 0:
            command = ser.readline().decode().strip()
            if command.startswith('s'):
                parse_settings_command(command)
            elif command.startswith('i'):
                send_info(ser)
        if sampling:
            sample(ser)
except KeyboardInterrupt:
    ser.close()
