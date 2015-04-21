import sys
import time
import ctypes
import logging

import redis
import json

from util import temperature_sensor
from daemon import runner

class App(object):
  def __init__(self, config_file_path):
    self.stdin_path = '/dev/stdin'
    self.stdout_path = '/dev/stdout'
    self.stderr_path = '/dev/stderr'
    self.pidfile_path =  '/var/run/sensor-daemon.pid'
    self.pidfile_timeout = 5

    if sys.argv[1] == 'start':
      self.config_file = open(config_file_path)
      self.config = json.loads(self.config_file.read())

      redis_port = self.config['redis_port'] || 6379
      redis_host = self.config['redis_host'] || 'localhost'
      redis_db = self.config['redis_db'] || 0

      self.redis = redis.Redis(host = redis_host, port = redis_port, db = redis_db)
      self.sensor_lib = ctypes.CDLL(self.config['sensor_lib_path'])
      self.temperature_sensor = temperature_sensor.TemperatureSensor(self.sensor_lib)
    else:
      self.config_file = None
      self.sensor_lib = None

    self.logger = logging.getLogger("sensor-daemon-log")
    self.logger.setLevel(logging.DEBUG)

    formatter = logging.Formatter("%(asctime)s: %(levelname)s %(message)s")
    self.log_handler = logging.FileHandler("/var/log/sensor-daemon.log")
    self.log_handler.setFormatter(formatter)
    self.logger.addHandler(self.log_handler)

  def run(self):
    while True:
      try:
        current_temperature = self.temperature_sensor.get_temperature()
        current_pressure = self.temperature_sensor.get_pressure()

        self.redis.multi()
        self.redis.hset('temperature', time.time(), current_temperature)
        self.redis.hset('pressure', time.time(), current_pressure)

        avg_temperature = reduce(lambda acc, t: acc + t, map(lambda t: float(t), self.redis.hvals('temperature')))
        avg_pressure = reduce(lambda acc, t: acc + t, map(lambda t: float(t), self.redis.hvals('pressure')))

        self.redis.set('avg_temperature', avg_temperature)
        self.redis.set('avg_pressure', avg_pressure)
        self.redis.execute()
      except Exception, e:
        self.logger.error(e)

      time.sleep(1)

if sys.argv[1] == 'start':
  try:
    config_file_path = sys.argv[2]
  except IndexError:
    raise Exception('You need to specify config file path')
else:
  config_file_path = None

app = App(config_file_path)

daemon_runner = runner.DaemonRunner(app)
daemon_runner.daemon_context.files_preserve = [app.log_handler.stream, app.config_file, app.sensor_lib]
daemon_runner.do_action()
