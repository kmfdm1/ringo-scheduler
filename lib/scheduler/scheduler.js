var {Worker} = require("ringo/worker");
var log = require("ringo/logging").getLogger(module.id);

var Scheduler = exports.Scheduler = function() {

    var tasks = {};
    var runningTasks = {};
    var lastTaskRun = {};

    /**
     * Add a new task to the scheduler
     * @param name {string} The task's name (unique for each task)
     * @param desc {object} The task's description which must hava at least a property "run" holding a function to execute
     *                      For examle: {run: function() { print("foo"); }, schedule: "*,*,*,*,*[slash]5"} would define a tast running in 5 minute intervals
     */
    this.addTask = function(name, desc) {
        if (tasks[name]) {
            throw new Error("Unable to add already registered task");
        }
        this.updateTask(name, desc);
        return this;
    };
    
    /**
     * Remove the tast having the given name
     * @param name {string} The name of the task to remove
     */
    this.removeTask = function(name) {
        delete tasks[name];
        return this;
    };
    
    /**
     * Update the task having the given name with the new description
     * @param name {string} The task's name (unique for each task)
     * @param desc {object} The task's description which must hava at least a property "run" holding a function to execute
     *                      For examle: {run: function() { print("foo"); }, schedule: "*,*,*,*,*[slash]5"} would define a tast running in 5 minute intervals
     */
    this.updateTask = function(name, desc) {
        tasks[name] = checkTaskDescription(desc);
        return this;
    };
    
    /**
     * Check if tasks are runnable now and spawns a worker executing their run-function.
     * If you add another task to this scheduler you may call this function to execute
     * this task imediately (if the defined schedule matches current time) without risking
     * to trigger already executed tasks within this minute.
     */
    this.checkRunnableTasks = function() {
        var now = new Date();
        for (var taskName in tasks) {
            try {
                var task = tasks[taskName];
                if (isNow(lastTaskRun[taskName], now)) {
                    continue;
                }
                if (!triggerNow(task.scheduleArr, now)) {
                    continue;
                }
                if (runningTasks[taskName]) {
                    log.info(taskName + "currently runnging since", runningTasks[taskName]);
                    continue;
                }
                spawn(function() {
                    runningTasks[taskName] = new Date();
                    try {
                        task.run();
                    } catch(e) {
                        log.error("Scheduler encountered exception while running", taskName);
                    }
                    delete runningTasks[taskName];
                });
                lastTaskRun[taskName] = now;
            } catch(e) {
                log.error("Error while executing task", taskName, e);
            }
        }
        return this;
    };

    var self = this;
    var worker = new Worker(module.id);
    /**
     * Start up the scheduler
     */
    this.start = function() {
        worker.postMessage({cmd: "start", instance: this});
        return this;
    };

    /**
     * Shut down the scheduler
     */
    this.stop = function() {
        worker.postMessage({cmd: "stop"});
        return this;
    };
    return this;
};

Scheduler.DATE_FUNCTIONS = ["getUTCSeconds", "getUTCMinutes", "getUTCHours", "getUTCDate", "getUTCMonth", "getUTCFullYear"];

var isNow = exports.testIsNow = function(lastRun, now) {
    if (!lastRun) {
        return false;
    }
    for each (var func in Scheduler.DATE_FUNCTIONS) {
        if (lastRun[func]() != now[func]()) {
            return false;
        }
    }
    return true;
};

var triggerNow = exports.testTriggerNow = function(arr, now) {
    for (var i = 0; i < 6; i++) {
        // asterisk matches all
        if (arr[i] == "*") {
            continue;
        }

        var val = now[Scheduler.DATE_FUNCTIONS[5-i]]();
        // numbers must be the same
        if (typeof(arr[i]) == "number") {
            if (val != arr[i]) {
                return false;
            }
            continue;
        }
        
        // one element of an array has to match
        if (Array.isArray(arr[i])) {
            var matches = false;
            for each (let el in arr[i]) {
                if (el != val) {
                    continue;
                }
                matches = true;
                break;
            }
            if (matches) {
                continue;
            }
            return false;
        } else if (arr[i].indexOf("*/") == 0) {
            // for months we have to add 1 to the value because 
            // js-dates starte with month 0
            if ((i == 1 &&  ((val+1) % parseInt(arr[i].substring(2), 10)) != 0) || 
                (i != 1 &&  (val % parseInt(arr[i].substring(2), 10)) != 0)) {
                // value divided with the value after the slash has to have a remainder of 0
                return false;
            }
        }
    }
    return true;
};

var checkScheduleElement = exports.testCheckScheduleElement = function(el) {
    if (!isNaN(el)) {
        return true;
    }
    if (el == "*") {
        return true;
    }
    if (el.indexOf("*/") == 0) {
        return !isNaN(el.substring(2)) && 
               el.substring(2).length > 0 && 
               el.substring(2) != "0"; // avoid division by zero
    }
    return false;
};

var checkTaskDescription = exports.testCheckTaskDescription = function(desc) {
    if (!desc.run || typeof(desc.run) != "function") {
        throw new Error("Taskdescription.run must not be empty and has to be a function");
    }
    if (!desc.schedule) {
        desc.schedule = "* * * * * 0";
    } else if (typeof(desc.schedule) != "string") {
        throw new Error("Taskdescription.schedule has to be a string");
    }
    desc.scheduleArr = desc.schedule.split(/[ \t]/);
    
    // check if the length of the schedule-element-array (must have min 5 elements)
    if (desc.scheduleArr.length < 5) {
        throw new Error("Taskdescription.schedule has to have 5 elements: year, month, day, hour(24h-format), minute");
    }
    desc.scheduleArr = desc.scheduleArr.map(function(val, index) {
        var result = val;
        if (val.indexOf(",") != -1) {
            result = result.split(",").map(function(el) {
                // only numbers allowed in comma-separated time-value-list
                if (isNaN(el)) {
                    throw new Error("unable to parse schedule: " + desc.schedule + " (" + val + "?)");
                }
                return parseInt(el, 10);
            });
            return result;
        } else if (!checkScheduleElement(val)) {
            throw new Error("unable to parse schedule: " + desc.schedule + " (" + val + "?)");
        } else if (!isNaN(val)) {
            result = parseInt(val, 10);
            if (index == 1) {
                result--; // subtract one because js-date starts with month 0
            }
        }
        return result;
    });
    if (desc.scheduleArr.length < 6) {
        desc.scheduleArr.push(0);
        desc.schedule += " 0";
    }
    return desc;
};

var timeoutId = null;

var run = function(instance) {
    instance.checkRunnableTasks();
    timeoutId = setTimeout(run, Math.max(0, calcDelay()), instance); 
};

var calcDelay = function() {
    var next = new Date();
    // next.setSeconds(0);
    next.setMilliseconds(0);
    next.setSeconds(next.getSeconds() +1);
    return next.getTime() - (new Date()).getTime();
};

var onmessage = function(event) {
    if (event.data.cmd == "start") {
        if (timeoutId != null) {
            return;
        }
        timeoutId = setTimeout(run, 0, event.data.instance);
        log.info("Scheduler started");
    } else if (event.data.cmd == "stop") {
        if (timeoutId == null) {
            return;
        }
        clearTimeout(timeoutId);
        log.info("Scheduler stopped");
    }
};