(function($) {

    $.query = (function() {
        
        var ChainQuery = function(url) {

            var self = this;

            self._url = url;
            self._options = {};
            self._xhr = null;
            
            return self;
        };

        ChainQuery.prototype = {

            options: function(options) {

                var self = this;

                $.extend(
                    true,
                    self._options,
                    options
                );

                return self;
            },
            data: function(data) {
                
                return this.options({data:data});
            },
            execute: function(callback) {
                
                var self = this,
                    options = self._options;

                options.success = callback || options.success;

                self._xhr = $.ajax(
                    $.extend(
                        {
                            url: self._url
                        },
                        options,
                        {
                            success: function(result) {
                                
                                self._lastResult = result;
                                
                                if(options.success) {

                                    return options.success.apply(this, arguments);
                                }
                            }
                        },
                        true
                    )
                );

                return self;
            },
            get: function(callback) {

                var self = this;

                self._options.type = "GET";
                self.execute(callback);
            },
            post: function(callback) {
                
                var self = this;

                self._options.type = "POST";
                self.execute(callback);
            },
            paginate: function(nextPage, previousPage) {
                
                var self = this;
                    
                self._nextPage = nextPage,
                self._previousPage = previousPage;

                return self;
            },
            nextPage: function() {
                
                var self = this,
                    next = self._nextPage;

                if(next) {

                    next(self);
                }

                return self;
            },
            previousPage: function() {
                
                var self = this,
                    previous = self._previousPage;

                if(previous) {

                    previous(self);
                }

                return self;
            },
            abort: function() {
                
                var self = this;

                if(self._xhr) {

                    self._xhr.abort();
                }

                self._xhr = null;

                return self;
            },
            value: function() {
                
                var self = this;

                return self._lastResult;
            },
            clone: function() {

                var self = this,
                    url = self._url,
                    options = self._options,
                    nextPage = self._nextPage,
                    previousPage = self._previousPage;
                
                return new ChainQuery(self._url).options(self._options).paginate(nextPage, previousPage);
            }
        };

        return function(url) {
            
            return new ChainQuery(url);
        }
    })();


})(jQuery);

