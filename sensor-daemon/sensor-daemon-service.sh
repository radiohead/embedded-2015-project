#! /bin/bash
# Provides: testdaemon
# Required-Start: $network $local_fs redis-server
# Required-Stop:  $network $local_fs redis-server
# Default-Start:  3 5
# Default-Stop:   0 1 2 6
# Short-Description: Test daemon process
# Description:    Runs up the test daemon process
case "$1" in
  start)
    echo "Starting sensor daemon"
    # Start the daemon 
    python /usr/bin/sensor-daemon.py start /etc/sensor-daemon.json
    ;;
  stop)
    echo "Stopping sensor daemon"
    # Stop the daemon
    python /usr/bin/sensor-daemon.py stop
    ;;
  *)
    # Refuse to do other stuff
    echo "Usage: /etc/init.d/sensor-daemon {start|stop}"
    exit 1
    ;;
esac

exit 0
