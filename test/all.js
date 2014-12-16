var system = require("system");
var assert = require("assert");
var scheduler = require("../lib/scheduler/scheduler");

var tests = {
        testIsNow: function() {
            assert.isFalse(scheduler.testIsNow(undefined, new Date("2014-01-01T00:00:01.432Z")));
            assert.isFalse(scheduler.testIsNow(new Date("2014-01-01T00:00:00.123Z"), new Date("2014-01-01T00:00:01.432Z")));
            assert.isTrue(scheduler.testIsNow(new Date("2014-01-01T00:00:00.123Z"), new Date("2014-01-01T00:00:00.432Z")));
        },
        testTriggerNow: function() {
            // Year
            assert.isFalse(scheduler.testTriggerNow([[2015,2016], "*", "*", "*", "*", "*"], new Date("2014-01-01T02:02:02.123Z")));
            assert.isTrue(scheduler.testTriggerNow([[2015,2014,2016], "*", "*", "*", "*", "*"], new Date("2014-01-01T02:02:02.123Z")));
            assert.isFalse(scheduler.testTriggerNow([2015, "*", "*", "*", "*", "*"], new Date("2014-01-01T02:02:02.123Z")));
            assert.isTrue(scheduler.testTriggerNow([2014, "*", "*", "*", "*", "*"], new Date("2014-01-01T02:02:02.123Z")));
            assert.isTrue(scheduler.testTriggerNow(["*/2", "*", "*", "*", "*", "*"], new Date("2014-01-01T02:02:02.123Z")));
            
            // Month
            assert.isFalse(scheduler.testTriggerNow(["*", [0,2], "*", "*", "*", "*"], new Date("2014-02-02T02:02:02.123Z")));
            assert.isTrue(scheduler.testTriggerNow(["*", [0,1,2], "*", "*", "*", "*"], new Date("2014-02-02T02:02:02.123Z")));
            assert.isFalse(scheduler.testTriggerNow(["*", 3, "*", "*", "*", "*"], new Date("2014-02-02T02:02:02.123Z")));
            // use 1 for the month here because parsing the schedule-string already subtracts the
            // 1 to compensate the js-date-starts-with-month-zero problem
            assert.isTrue(scheduler.testTriggerNow(["*", 1, "*", "*", "*", "*"], new Date("2014-02-02T02:02:02.123Z")));
            assert.isTrue(scheduler.testTriggerNow(["*", "*/2", "*", "*", "*", "*"], new Date("2014-02-02T02:02:02.123Z")));
            
            // Day
            assert.isFalse(scheduler.testTriggerNow(["*", "*", [1,3], "*", "*", "*"], new Date("2014-02-02T02:02:02.123Z")));
            assert.isTrue(scheduler.testTriggerNow(["*", "*", [1,2,3], "*", "*", "*"], new Date("2014-02-02T02:02:02.123Z")));
            assert.isFalse(scheduler.testTriggerNow(["*", "*", 3, "*", "*", "*"], new Date("2014-02-02T02:02:02.123Z")));
            assert.isTrue(scheduler.testTriggerNow(["*", "*", 2, "*", "*", "*"], new Date("2014-02-02T02:02:02.123Z")));
            assert.isTrue(scheduler.testTriggerNow(["*", "*", "*/2", "*", "*", "*"], new Date("2014-02-02T02:02:02.123Z")));

            // Hour
            assert.isFalse(scheduler.testTriggerNow(["*", "*", "*", [1,3], "*", "*"], new Date("2014-02-02T02:02:02.123Z")));
            assert.isTrue(scheduler.testTriggerNow(["*", "*", "*", [1,2,3], "*", "*"], new Date("2014-02-02T02:02:02.123Z")));
            assert.isFalse(scheduler.testTriggerNow(["*", "*", "*", 3, "*", "*"], new Date("2014-02-02T02:02:02.123Z")));
            assert.isTrue(scheduler.testTriggerNow(["*", "*", "*", 2, "*", "*"], new Date("2014-02-02T02:02:02.123Z")));
            assert.isTrue(scheduler.testTriggerNow(["*", "*", "*", "*/2", "*", "*"], new Date("2014-02-02T02:02:02.123Z")));

            // Minute
            assert.isFalse(scheduler.testTriggerNow(["*", "*", "*", "*", [1,3], "*"], new Date("2014-02-02T02:02:02.123Z")));
            assert.isTrue(scheduler.testTriggerNow(["*", "*", "*", "*", [1,2,3], "*"], new Date("2014-02-02T02:02:02.123Z")));
            assert.isFalse(scheduler.testTriggerNow(["*", "*", "*", "*", 3, "*"], new Date("2014-02-02T02:02:02.123Z")));
            assert.isTrue(scheduler.testTriggerNow(["*", "*", "*", "*", 2, "*"], new Date("2014-02-02T02:02:02.123Z")));
            assert.isTrue(scheduler.testTriggerNow(["*", "*", "*", "*", "*/2", "*"], new Date("2014-02-02T02:02:02.123Z")));

            // Second
            assert.isFalse(scheduler.testTriggerNow(["*", "*", "*", "*", "*", [1,3]], new Date("2014-02-02T02:02:02.123Z")));
            assert.isTrue(scheduler.testTriggerNow(["*", "*", "*", "*", "*", [1,2,3]], new Date("2014-02-02T02:02:02.123Z")));
            assert.isFalse(scheduler.testTriggerNow(["*", "*", "*", "*", "*", 3], new Date("2014-02-02T02:02:02.123Z")));
            assert.isTrue(scheduler.testTriggerNow(["*", "*", "*", "*", "*", 2], new Date("2014-02-02T02:02:02.123Z")));
            assert.isTrue(scheduler.testTriggerNow(["*", "*", "*", "*", "*", "*/2"], new Date("2014-02-02T02:02:02.123Z")));
        },
        testCheckScheduleElement: function() {
            for each (var el in ["*", "1", "*/1"]) {
                assert.isTrue(scheduler.testCheckScheduleElement(el));
            }
            for each(var el in ["**", "2*", "*/*", "*/"]) {
                assert.isFalse(scheduler.testCheckScheduleElement(el));
            }
        },
        testCheckTaskDescription: function() {
            try {
                scheduler.testCheckTaskDescription({
                    run: "not a function"
                });
                scheduler.testCheckTaskDescription({
                    schedule: "* * * *", // need at least 5 elements
                    run: function() {}
                });
                scheduler.testCheckTaskDescription({
                    schedule: "* * * * * * *", // too much, 6 is maximum
                    run: function() {}
                });
                assert.fail();
            } catch(e) {
                // ignore
            }
            var result = scheduler.testCheckTaskDescription({
                run: function() {}
            });
            assert.equal(result.schedule, "* * * * * 0");
            assert.deepEqual(result.scheduleArr, ["*", "*", "*", "*", "*", 0]);
            
            var result = scheduler.testCheckTaskDescription({
                schedule: "* 1 * * *",
                run: function() {}
            });
            assert.equal(result.schedule, "* 1 * * * 0");
            assert.deepEqual(result.scheduleArr, ["*", 0, "*", "*", "*", 0]);

            var result = scheduler.testCheckTaskDescription({
                schedule: "* 1 * * * 1",
                run: function() {}
            });
            assert.equal(result.schedule, "* 1 * * * 1");
            assert.deepEqual(result.scheduleArr, ["*", 0, "*", "*", "*", 1]);
        }
};

if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
            [tests].concat(system.args.slice(1))));
}
