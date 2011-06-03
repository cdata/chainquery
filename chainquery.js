(function(window, document, undefined) {

/*
 * interface defineable
 *
 * parameter Target:Object - A constructor to apply the interface to
 * 
 * A defineable class implements a method 'define' that enabled a standard
 * interface for basic setter / getter methods that play nicely with the
 * 'chained' nature of the ChainQuery library. Is's also a shortcut to keep
 * code size down.
 */
    var defineable = function(Target) {

            var definitions = [];

            Target.define = function(properties) {

                each(
                    properties,
                    function(value, property) {

                        definitions[property] = true;
                        Target.prototype[property] = (function() {

                            var valueProxy = value;

                            return function(value, extend) {

                                var self = this;

                                if(value !== undefined) {

                                    if(typeCompare(valueProxy, value, {}) && extend === true) {

                                        extend(valueProxy, value);
                                    } else {

                                        valueProxy = value;
                                    }
                                    return self;
                                } else {

                                    return valueProxy;
                                }
                            };
                        })();
                    }
                );
            };

            Target.prototype.define = function(settings) {

                var self = this;

                each(
                    settings,
                    function(value, setting) {

                        if(Target.definitions[setting]) {

                            self[setting](value);
                        }
                    }
                );

                return self;
            };

            Target.definitions = definitions;

            return Target;
        },
        each = function(list, callback) {

            if(list.length) {

                for(var index = 0; index < list.length; index++) {

                    if(callback(list[index], index, list) === false) {

                        break;
                    }
                }
            } else {

                for(var property in list) {

                    if(callback(list[property], property, list) === false) {

                        break;
                    }
                }
            }
        },
        extend = function(object, extension) {

            each(
                extension,
                function(value, property) {
                    
                    object[property] = extension[property];
                }
            );

            return object;
        },
        typeCompare = function() {

            var args = Array.prototype.slice.call(arguments),
                type = typeof args.shift(),
                homogenous = true;

            each(
                args,
                function(arg) {

                    if(typeof arg !== type) {

                        return homogenous = false;
                    }
                }
            );

            return homogenous;
        },

        // Transport attributes
        multipart = 1,
        crossdomain = 2,
        jsonp = 4;
        
/*
 * global ie
 *
 * If this global property is defined, it is a number. If it is a number, then
 * the current user agent is Internet Explorer, and the number corresponds to
 * the user agent's major version number.
 * 
 * Sexilicious IE detection courtesy of James Padolsey and others. See:
 * https://gist.github.com/527683
 */
    window.ie = (function() {

        var version = 3,
            div = document.createElement('div'),
            sigil = div.getElementsByTagName('i');
    
        while (
            div.innerHTML = '<!--[if gt IE ' + (++version) + ']><i></i><![endif]-->',
            sigil[0]
        );
    
        return version > 4 ? version : undefined;
        
    })();

/*
 * global transport
 *
 * parameter attributes:Number - A map of type settings.
 *
 * This global property is a factory that produces instances of the Transport
 * class. It takes a bit map of attributes. Currently supported attributes are
 * multipart, crossdomain and jsonp. 
 */
    window.transport = (function() {

        // Grab a reference to the detected IE version, if any.
        var ie = window.ie,
        
        // Valid IE transports should only need to be checked the first
        // a Transport class is instantiated.
            validIETransports = [
                'Microsoft.XMLHTTP',
                'MSXML2.XMLHTTP.3.0',
                'MSXML3.XMLHTTP',
                'MSXML2.XMLHTTP.6.0'
            ],
            transport = function(attributes) {

                return new Transport(attributes);
            },

/*
 * class Transport : defineable
 *
 * The Transport class is an abstract wrapper that simplifies control of the
 * various incarnations of the XMLHttpRequest. The transport allows simplified
 * definition of request headers, and exposes a basic interface for dispatching
 * an request.
 */
            Transport = defineable(function(attributes) {
                
                this.attributes(attributes || 0).invalidate();
            });
        
        extend(
            Transport.prototype,
            {

                invalidate: function() {

                    var self = this,
                        xhr = self.xhr,
                        attributes = self.attributes(),
                        XMLHttpRequest = window.XMLHttpRequest,
                        XDomainRequest = window.XDomainRequest;
                    
                    if(attributes & jsonp) {

                        xhr(document.createElement('script'));
                    } else {
                        if(XMLHttpRequest) {

                            xhr(new XMLHttpRequest());
                        } else if((attributes & (crossdomain | multipart)) && ie >= 8 && XDomainRequest) {

                            xhr(new XDomainRequest());
                        } else if(ie) {
                            
                            while(validIETransports.length && !xhr()) {

                                try {

                                    xhr(new ActiveXObject(validIETransports[validIETransports.length]));
                                } catch(e) {

                                    validIETransports.pop();
                                }
                            }
                        } else {

                            throw "Could not determine a valid HTTP request transport!";
                        }
                    }

                    return self;
                },

/*
 * member Transport::send
 *
 * parameter method:String - The HTTP method to be used.
 * parameter url:String - The HTTP endpoint being targetted.
 * parameter data:Object (optional) - Additional data to send with the request.
 * 
 * returns Transport - Instance returns a reference to itself.
 * 
 * The send method performs the steps necessary to execute a given request. It
 * takes responsibility for making sure all necessary pre-request settings are
 * defined properly, including event handlers, data and request headers.
 */
                send: function(method, url, data) {

                    var self = this,
                        attributes = self.attributes(),
                        headers = self.headers(),
                        xhr = self.xhr();

                    if(attributes & jsonp) {
                        
                        (function() {

                            var callback = 'query' + Math.floor(Math.random() * (new Date).getTime()),
                                cursor = document.getElementsByTagName('script')[0],
                                handleLoad = function(json) {

                                    self.response(json).complete()(json, self);
                                },
                                data = self.data() || {};

                            xhr.onload = xhr.onreadystatechange = function() {

                                var readyState = xhr.readyState;

                                if(readyState && readyState != 'loaded' && readyState != 'complete') {

                                    return;
                                }
                                
                                xhr.onload = xhr.onreadystatechange = null;

                                xhr.parentNode.removeChild(xhr);
                                delete window[callback];
                            };

                            data.callback = callback;
                            window[callback] = handleLoad;

                            cursor.src = url;
                            cursor.parentNode.insertBefore(xhr, cursor);
                            
                        })();
                    } else {
                    
                        (function() {
                            // Parse the response text and pull out the last 'chunk,'
                            // where a chunk is defined as the amount of data downloaded
                            // since we last checked it.
                            var resolveChunk = function() {
                                    
                                    var responseText = xhr.responseText,
                                        chunk = responseText.substring(bufferLength, bufferLength = responseText.length);

                                    return chunk.length ? chunk : false;
                                },
                                handleProgress = function() {

                                    var chunk = resolveChunk(),
                                        handler = self.progress();

                                    if(chunk) {

                                        handler(chunk, self);
                                    }
                                },
                                handleLoad = function() {
                                    
                                    var response = xhr.responseText,
                                        handler = self.complete();

                                    clearInterval(dataInterval);
                                    handleProgress();

                                    self.response(response);
                                    handler(response, self);
                                },
                                bufferLength = 0,
                                setInterval = window.setInterval,
                                clearInterval = window.clearInterval,
                                dataInterval;

                            if((attributes & (multipart | crossdomain)) && ie >= 8) {

                                // We use the onprogress and onload handlers when we are dealing with
                                // a XDomainRequest object.
                                xhr.onprogress = function() {
                                    
                                    if(!dataInterval) {

                                        dataInterval = setInterval(handleProgress, 30);
                                    }
                                };

                                xhr.onload = handleLoad;
                            } else {

                                // In most cases, the only handler we have to deal with is the
                                // standard XMLHttpRequest, or something with the same interface.
                                xhr.onreadystatechange = function() {

                                    var readyState = xhr.readyState;

                                    if(readyState === 3 && !dataInterval) {

                                        dataInterval = setInterval(handleProgress, 30);
                                    } else if(readyState === 4) {

                                        handleProgress();
                                        handleLoad();
                                    }
                                };
                            }
                        })();

                        xhr.open(method, url, true);

                        each(
                            headers,
                            function(value, header) {

                                xhr.setRequestHeader(header, value);
                            }
                        );

                        xhr.send(data);

                    }
                    return self;
                }
            }
        );

/*
 * Transport setter / getter
 *
 * The following properties take the form of basic setter getter methods on
 * a transport instance, per the 'defineable' pattern outlined above.
 */
        Transport.define(
            {
                xhr: null, // The raw transport being used by the instance
                response: null, // The last response received
                attributes: 0, // A bit set containing transport attributes
                headers: {}, // The request headers to set on the transport
                async: true, // Whether or not the transport should be async
                error: function(){}, // An error handler
                progress: function(){}, // A progress handler
                complete: function(){} // A complete handler
            }
        );

        // Store the bit sets for transport attributes on the global factory
        // for user access later on..
        transport.multipart = multipart;
        transport.crossdomain = crossdomain;
        transport.jsonp = jsonp;

        return transport;
    })();

/*
 * global query
 *
 * parameter url:String (optional) - The HTTP endpoint for the request.
 *
 * This global property is a factory that produces instances of the Query class.
 */

    window.query = (function() {


        var dataTypeMap = {
                'none' : false,
                'form' : 'application/x-www-form-urlencoded',
                'xml' : 'application/xml',
                'text' : 'text/plain',
                'json' : 'application/json',
                'any' : '*/*'
            },
            query = function(url) {

                return new Query(url);
            },
/*
 * class Query : defineable
 *
 * parameter url:String (optional) - The HTTP endpoint for the request.
 *
 * The Query class defines a stateful entity that enables the tasty and simple
 * creation and execution of HTTP requests via an XMLHttpRequest-esque transport
 * mechanism.
 */
            Query = defineable(function(url) {

                this.transport(transport()).url(url);
            });

        
        extend(
            Query.prototype,
            {

/*
 * member Query::request
 *
 * parameter method:String (optional) - The HTTP method to be used.
 * parameter url:String (optional) - The HTTP endpoint for the request.
 * 
 * This method executes the current request based on settings defined by other
 * methods, such as headers, request methods, data types etc. If defined, the
 * universal callback is deferred to for handling the response to requests.
 */
                request: function(method, url, data) {

                    var self = this,
                        endpoint = url || self.url(),
                        type = method || self.method(),
                        data = data || self.data(),
                        dataType = self.dataType(),
                        transport = self.transport()
                            .error(
                                function(error) {
                                    self.error()(error, self);
                                }
                            ).progress(
                                function(data) {
                                    self.progress()(data, self);
                                }
                            ).complete(
                                function(data) {
                                    self.response(data).complete()(data, self);
                                }
                            );
                    
                    self.data(data);
                    self.url(url);

                    if(dataType == dataTypeMap.json && typeof data == 'object' && JSON) {

                        if(type.toLowerCase() === 'get') {

                            type = 'POST';
                        }

                        try {
                            
                            data = JSON.stringify(data);
                        } catch(e){}
                    }

                    self.method(type);

                    if(method.toLowerCase() === 'get') {

                        endpoint = endpoint.split('?')[0] + '?';

                        for(var key in data) {

                            url += key + '=' + data[key] + '&';
                        }

                        data = undefined;
                    }

                    transport.headers(
                        {
                            'Content-Type' : dataType
                        }
                    ).async(self.async()).send(type, endpoint, data);
                
                    return self;
                },

/*
 * member Query::get, Query::post
 *
 * parameter url:String (optional) - The HTTP endpoint for the request
 * 
 * These methods are shortcuts that forward parameters to the 'request' method.
 */
                get: function(url) { return this.request('GET', url); },
                post: function(url) { return this.request('POST', url); },

/*
 * member Query::abort
 *
 * This method aborts the current request if one is active.
 */
                abort: function() { this.transport().abort(); return self; },

                headers: function() { this.transport().headers.apply(undefined, arguments); return self; },

/*
 * member Query::clone
 *
 * This method clones the current query and returns the clone.
 */
                clone: function() {

                    var self = this,
                        clone = new Query();

                    each(
                        Query.definitions,
                        function(value, definition) {

                            if(definition !== 'transport') {

                                clone[definition](self[definition]());
                            }
                        }
                    );

                    return clone;
                }
            }
        );

        Query.define(
            {
                data: null,
                url: "",
                method: 'GET',
                async: true,
                dataType: dataTypeMap.json,
                transport: null,
                response: null,
                error: function(){},
                progress: function(){},
                complete: function(){}
            }
        );

        // Store our datatypes in the global query factory for user
        // access later on.
        for(var key in dataTypeMap) {

            query[key] = dataTypeMap[key];
        }

        return query;
    })();

})(window, document);

