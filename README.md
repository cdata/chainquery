# ChainQuery

ChainQuery is a very basic library intended to make jQuery AJAX requests less of an ugly chore. If you are writing an HTML frontend for a web app, this means that you are making a lot of very similar AJAX requests all over the place. ChainQuery allows you to cut down on the cruft associated with this.

## Examples

### Basic AJAX Request

    $.query('/path/to/service/endpoint').execute();

### Reuse and Recycle

    var getFoo = $.query('/path/to/service/endpoint').options({success: function() { /* parse service data */ }});
    var getBar = getFoo.clone().data({query: "bar"});

    getFoo.execute();
    getBar.execute();

