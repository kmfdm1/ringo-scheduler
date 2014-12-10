
exports.scheduler = module.singleton("scheduler", function() {
    var {Scheduler} = require("./scheduler");
    return new Scheduler();
});