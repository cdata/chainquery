(function(window, document, undefined) {

/*
 * Utilities
 */
    var each = function(list, callback) {

            if(list.length) {

                for(var index = 0; index < list.length; index++)
                    if(callback(list[index], index, list) === false) break;

            } else {

                for(var property in list)
                    if(callback(list[property], property, list) === false) break;

            }
        },
        extend = function(object, extension) {

            each(extension, function(value, property) { object[property] = extention[property]; });
            return object;
        },
        compare = function() {

            var args = Array.prototype.slice.call(arguments),
                type = typeof args.shift(),
                homogenous = true;

            each(args, function(arg) { return homogenous = typeof arg === type; });

            return homogenous;
        },
        inherits = function(Class, SuperClass) {

            extend(Class.prototype, new SuperClass());
            return Class;
        },
/*
 * interface defineable
 */
        defineable = function(Target) {

            var definitions = {};

            Target.define = function(properties) {

                each(
                    properties,
                    function(value, property) {

                        definitions[property] = true;

                        Target.prototype[property] = function(newValue, extend) {

                            var self = this;

                            if(newValue !== undefined) {

                                compare(newValue, value, {}) && extend === true ? extend(value, newValue) : value = newValue;
                                return self;
                            } else {

                                return value;
                            }
                        };
                    }
                );
            };

            Target.prototype.define = function(settings) {

                var self = this;

                each(settings, function(value, setting) { if(definitions[setting]) self[setting](value); });

                return self;
            };

            Target.definitions = definitions;

            return Target;
        },

/*
 * interface request
 */
        request = function(Target) {

            Target.prototype.send = function(method, url, data) {};

            Target.define(
                {
                    complete: function() {},
                    progress: function() {},
                    error: function() {},
                    timeout: 0,
                    headers: {},
                    data: null
                }
            );
        },

/*
 * Stored DOM properties
 */

        XMLHttpRequest = window.XMLHttpRequest,
        XDomainRequest = window.XDomainRequest,
        ActiveXObject = window.ActiveXObject,
        createElement = document.createElement,
        setInterval = window.setInterval,
        clearInterval = window.clearInterval,

/*
 * Transport attributes
 * 
 */
        standard = 1,
        multipart = 2,
        bag = 4,
        jsonp = 8;

/*
 * global ie
 */
    window.ie = (function() {

        var version = 3,
            div = createElement('div'),
            sigil = div.getElementsByTagName('i');
    
        while(div.innerHTML = '<!--[if gt IE ' + (++version) + ']><i></i><![endif]-->', sigil[0]);

        return version > 4 ? version : undefined;
    })();

    window.transport = (function() {

        var validIETransports = [
                'Microsoft.XMLHTTP',
                'MSXML2.XMLHTTP.3.0',
                'MSXML3.XMLHTTP',
                'MSXML2.XMLHTTP.6.0'
            ],
            constructionActivated = false,
            Request = defineable(function() {}),
            StandardRequest = inherits(function() {
                
                if(constructionActivated) {
                
                    var self = this,
                        transport = self.transport;

                    if(XMLHttpRequest) {

                        transport(new XMLHttpRequest());
                    } else {

                        while(validIETransports.length && !transport()) {

                            try {

                                transport(new ActiveXObject(ieTransports[ieTransports.length]));
                            } catch(e) {

                                ieTransports.pop();
                            }
                        }
                    }
                }
            }),
            MultipartRequest = inherits(function() {

                if(constructionActivated) {

                    StandardRequest.apply(this);
                }
            }, Request),
            MultipartBagRequest = inherits(function() {

                if(constructionActivated) {

                    MultipartRequest.apply(this);
                }
            }, MultipartRequest),
            JSONPRequest = inherits(function() {

                if(constructionActivated) {

                    this.transport(createElement('script'));
                }
            }, Request),
            transport = function(type) {

                constructionActivated = true;

                switch(type) {
                    case multipart:
                        return new MultipartRequest();
                    case bag:
                        return new MultipartBagRequest();
                    case jsonp:
                        return new JSONPRequest();
                }

                return new Request();
            };

         Request.define(
            {
                transport: null,
                async: true,
                complete: function() {},
                progress: function() {},
                error: function() {},
                timeout: 0,
                headers: {},
                data: null,
                bufferLength: 0,
                dataInterval: null
            }
        );
        
        extend(
            StandardRequest.prototype,
            {
                send: function(method, url, data) {

                    var self = this,
                        transport = self.transport(),
                        async = self.async();

                    transport.onreadystatechange = function() {

                        var readyState = transport.readyState;

                        if(readyState === 3 && !dataInterval) {

                            self.handleProgress();

                        } else if(readyState === 4) {

                            self.handleComplete();
                            transport.onreadystatechange = null;
                        }
                    };

                    transport.open(method, url, async);

                    each(headers, function(value, header) { transport.setRequestHeader(header, value); });

                    transport.send(data);

                },
                resolveChunk: function() {

                    var self = this,
                        response = self.transport().responseText,
                        bufferLength = self.bufferLength,
                        chunk = response.substring(bufferLength(), bufferLength(response.length));

                    return chunk.length ? chunk : false;
                },
                handleProgress: function() {

                    var self = this,
                        chunk = self.resolveChunk();
                        handler = self.progress();

                    if(chunk) {

                        handler(chunk, self);
                    }
                },
                handleLoad: function() {

                    var self = this,
                        response = self.transport().responseText,
                        handler = self.complete(),
                        dataInterval = self.dataInterval();

                    if(dataInterval) {

                        clearInterval(dataInterval);
                        handleProgress();
                    }

                    handler(response, self);
                }
            }
        );

        MultipartRequest.prototype.resolveChunk = function() {

        };

        MultipartBagRequest.prototype.resolveChunk = function() {

        };

        JSONP.prototype.send = function(url, data) {

        };

        return transport;
    })();

})(window, document);
