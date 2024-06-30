import serial
import time

class Board:
    def __init__(self, board_name, pins, pin_labels):
        self.board_name = board_name
        self.pins = pins
        self.pin_labels = pin_labels
        self.num_channels = len(pins)
        self.sampling = False
        self.sampling_rate = 100
        self.used_channels = [1] + [0] * (self.num_channels - 1)
        self.num_used_channels = 1
        self.ser = serial.Serial('COM15', 115200, timeout=1)  # Update the port as needed

    def begin(self):
        time.sleep(1.0)
        self.send_message("READY")
        time.sleep(1.0)

    def set_pin_mode(self, pin, mode):
        # Placeholder for setting pin mode
        pass

    def send_message(self, message):
        self.ser.write((message + '\r\n').encode())

    def read_message(self):
        return self.ser.readline().decode().strip()

    def loop(self):
        if self.sampling:
            self.sample()

        if self.ser.in_waiting:
            command = self.read_message()
            if command.startswith('s'):
                self.parse_settings_command(command)
            elif command.startswith('i'):
                self.send_info()
        
        time.sleep(1 / self.sampling_rate)

    def parse_settings_command(self, command):
        parts = command.split(',')
        self.sampling = (parts[0][1] == '1')
        self.sampling_rate = int(parts[1])
        used_channels_str = parts[2]
        self.used_channels = [1 if c == '1' else 0 for c in used_channels_str]

        self.num_used_channels = sum(self.used_channels)

        self.send_message("OK")

    def send_info(self):
        info = f"{self.board_name},{self.num_channels},{self.sampling_rate},"
        info += ",".join(self.pin_labels) + ","
        info += ",".join(str(c) for c in self.used_channels)

        self.send_message(info)

    def sample(self):
        values = []
        for i in self.pins:
            if self.used_channels[i] == 1:
                value = self.read_analog(i)
                values.append(str(value))

        self.send_message(",".join(values))
        time.sleep(1.0 / self.sampling_rate)

    def read_analog(self, pin):
        # Placeholder for reading analog value
        return (pin + 1) * 100

# Example usage
pins = range(6)  # Example pin numbers
pin_labels = ["A0", "A1", "A2", "A3", "A4", "A5"]
board = Board("Simulator", pins, pin_labels)
board.begin()

while True:
    try:
        board.loop()
    except KeyboardInterrupt:
        break
