import sys
import time
import ctypes
import logging

import redis
import json
import util

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

      self.redis_conn = redis.Redis(host=self.config['redis_host'], port=self.config['redis_port'], db=0)
      self.sensor_lib = ctypes.CDLL(self.config['sensor_lib_path'])
      self.temperature_sensor = util.TemperatureSensor(self.sensor_lib)
    else:
      self.config_file = None

    self.logger = logging.getLogger("sensor-daemon-log")
    self.logger.setLevel(logging.DEBUG)

    formatter = logging.Formatter("%(asctime)s: %(levelname)s %(message)s")
    self.log_handler = logging.FileHandler("/var/log/sensor-daemon.log")
    self.log_handler.setFormatter(formatter)
    self.logger.addHandler(self.log_handler)

  def run(self):
    while True:
      try:
        self.logger.info('Temperature: ' + self.temperature_sensor.get_temperature())
        self.logger.info('Pressure: ' + self.temperature_sensor.get_pressure())
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
daemon_runner.daemon_context.files_preserve = [app.log_handler.stream, app.config_file]
daemon_runner.do_action()
