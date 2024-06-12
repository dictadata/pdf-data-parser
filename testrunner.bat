REM Run tasks from launch.json where "program" includes LAUNCH_PROGRAM
REM and "name" includes %1 argument, if defined.
REM tr_launcher is a node.js bin script in @dictadata/lib project.
SET NODE_ENV=development
SET LOG_LEVEL=verbose
SET LAUNCH_PROGRAM=/test/
tr_launcher %1
