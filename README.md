A simple scheduler for ringojs

# Usage:

## Initialize the scheduler and get it running
    var {scheduler} = require("./lib/scheduler/main");
    scheduler.start();

## Add a task to the scheduler
    scheduler.addTask("sayHello", {
            schedule: "*,*,*,9,0",
            run: function() {
                    print("Good morning");
            }
    });

## Update a task
    scheduler.updateTask("sayHello", {
            schedule: "*,*,*,11,5",
            run: function() {
                    print("Hello");
            }
    });

## Remove a task
    scheduler.removeTask("sayHello");

## Task definition
A task always needs a name (like "sayHello" in the previous examples) and a description what should be done when.
If the when is omitted it will assume that the task should be run every minute.

A schedule is given as comma separated list defining the execution-times similar to linux's crontab in the following order:
year, month, dayOfMonth, hour, minute

Every element may be a number, an asterisk or "*/" followed by a number.
The asterisk matches every number, a number matches the exact number and the */ notation divides the actual time's number 
with the number after the slash. It matches if it's remainder is zero.

For example the following will trigger a function every first of the month at the beginning of every even hour.
    "*,*,1,*/2,0"
