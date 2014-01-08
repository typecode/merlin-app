define(['jquery'], function($) {

    var App = function(options) {
        var self = this, o;

        o = $.extend({
            page: {
                _features: [],
                add_feature: $.noop
            },
            ensure_console: true,
            debug: true
        }, options);

        if (o.ensure_console) {
            window.console = App.get_console(o.debug);
        }

        this.debug = o.debug;
        this.page = o.page;
        this.events = $({});
        this.contexts = {};

        this._deferred = [];
        this._is_initializing = true;

        this.invoke_feature_set(this.page._features);
        this.page.add_feature = function() {
            self.invoke_feature.apply(self, arguments);
        };
    };

    App.prototype.invoke_feature = function(feature, callback) {
        var self = this;

        if (!$.isFunction(callback)) {
            callback = $.noop;
        }

        if ($.isFunction(feature)) {
            feature(self);
            callback();
        } else if (typeof feature === 'string') {
            require([feature], function() {
                callback();
            });
        } else if (typeof feature === 'object' && feature && $.isArray(feature.require)) {
            require(feature.require, function() {
                var args;
                if ($.isFunction(feature.callback)) {
                    args = [self];
                    $.each(arguments, function(i, arg) {
                        args.push(arg);
                    });
                    feature.callback.apply(this, args);
                }
                callback();
            });
        }
    };

    App.prototype.invoke_feature_set = function(feature_set, callback) {
        var self = this,
        n_features,
        n_initialized,
        feature_init_callback;

        if (!feature_set || typeof feature_set !== 'object' || !feature_set.length) {
            return false;
        }

        n_features = feature_set.length;
        n_initialized = 0;

        feature_init_callback = function() {
            n_initialized += 1;
            if (n_initialized === n_features) {
                if (self._is_initializing) {
                    self.events.trigger(App.event_types.FEATURES_INITIALIZED);
                    self._is_initializing = false;
                    $.each(self._deferred, function(i, fn) {
                        fn();
                    });
                    self._deferred = [];
                }
                if ($.isFunction(callback)) {
                    callback();
                }
            }
        };

        $.each(feature_set, function(i, feature) {
            self.invoke_feature(feature, feature_init_callback);
        });
    };

    App.prototype.defer_feature = function(callback) {
        if (this._is_initializing) {
            this._deferred.push(callback);
        } else {
            callback();
        }
    };

    App.prototype.new_context = function(name) {
        var self = this, context;
        context = self.contexts[name];
        if (context) {
            $.each(context, function(k, module) {
                if ($.isFunction(module.destroy)) {
                    module.destroy();
                }
                delete context[k];
            });
        }
        self.contexts[name] = {};
        return self.contexts[name];
    };

    App.event_types = {
        FEATURES_INITIALIZED: 'app_features_initialized'
    };

    var dummy_console;

    App.get_console = function(debug) {
        if (debug && typeof window.console !== 'undefined') {
            return window.console;
        }
        if (!dummy_console) {
            dummy_console = {};
            $.each(('assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn').split(','), function() {
                dummy_console[this] = $.noop;
            });
        }
        return dummy_console;
    };

    return App;

});