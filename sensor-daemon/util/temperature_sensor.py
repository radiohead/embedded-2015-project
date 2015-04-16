import math
import ctypes

class TemperatureSensor(object):
  def __init__(self, sensor):
    self.sensor = sensor
    if (0 == self.sensor.bcm2835_init()):
      raise Exception("Sensor driver init failed")

    self.init_pressure()
    self.activate()

  def write_register(self, register, value):
      self.sensor.MPL3115A2_WRITE_REGISTER(register, value)

  def read_register(self, register):
    return self.sensor.MPL3115A2_READ_REGISTER(register)

  def activate(self):
    self.sensor.MPL3115A2_Active()

  def standby(self):
    self.sensor.MPL3115A2_Standby()

  def init_pressure(self):
    self.sensor.MPL3115A2_Init_Bar()

  def read_temperature(self):
    return self.sensor.MPL3115A2_Read_Temp()

  def read_altitude(self):
    return self.sensor.MPL3115A2_Read_Alt()

  def get_temperature(self):
    t = self.read_temperature()
    t_m = (t >> 8) & 0xff;
    t_l = t & 0xff;

    if (t_l > 99):
      t_l = t_l / 1000.0
    else:
      t_l = t_l / 100.0
    return (t_m + t_l)

  def get_pressure(self):
    alt = self.read_altitude()
    alt_m = alt >> 6
    alt_l = alt & 0x03

    if (alt_l > 99):
      alt_l = alt_l
    else:
      alt_l = alt_l

    return (self.twos_to_int(alt_m, 18) * 0.00750061683)

  def twos_to_int(self, val, len):
    # Convert twos compliment to integer
    if(val & (1 << len - 1)):
      val = val - (1 << len)

    return val
