/*
 * This module uses jQuery Hashchange (http://benalman.com/projects/jquery-hashchange-plugin/)
 * as a fallback to emulate pushstate behavior on browsers that don't support pushstate.
 * The hashchange plugin subsequently requires jQuery Migrate (https://github.com/jquery/jquery-migrate)
 * if being used with jQuery version 1.9 +
 */

define(['jquery'], function($) {

    var PushstateHelper = function(options) {

        var self = this, o, internal, fn, handlers;

        o = $.extend({
            app: null,
            use_hash: (window.history && window.history.pushState ? false : true)
        }, options);

        internal = {
            name: 'mod.PushstateHelper',
            previous_path: o.use_hash ?
                window.location.hash.replace('#', '') : window.location.pathname
        };

        fn = {
            init: function() {
                $(document).on('click', '.js-use-pushstate, .js-simulate-pushstate, .js-do-popstate', handlers.doc_click);

                $(window)
                    .on('popstate', handlers.popstate)
                    .on('pushstate', handlers.pushstate)
                    .on('simulate-pushstate', handlers.simulate_pushstate);

                if (o.use_hash) {
                    require(['jquery_migrate', 'hashchange'], function() {
                        $(window).on('hashchange', handlers.hashchange);
                        fn.statechange(window.location.hash);
                    });
                } else {
                    fn.statechange(window.location.pathname);
                }
            },
            statechange: function(pathname, data){
                var i, path_components, position, _event_data;

                if (o.use_hash) {
                    pathname = pathname.replace('#', '');
                }

                path_components = PushstateHelper.get_path_components(pathname);

                _event_data = {
                    path: pathname,
                    components: path_components,
                    data: data ? data : {}
                };

                if (!_event_data.data.previous_path) {
                    _event_data.data.previous_path = internal.previous_path;
                }

                o.app.events.trigger(PushstateHelper.event_types.PUSHSTATE_EVENT, _event_data);

                internal.previous_path = _event_data.path;
            },

            get_path_components: function(){
                return internal.components;
            }
        };

        handlers = {
            doc_click: function(e, d) {
                var $t, _href, _data;
                e.preventDefault();
                $t = $(this);
                _href = $t.attr('href');
                _data = $t.data();
                if($t.hasClass('js-use-pushstate')){
                    e.stopImmediatePropagation();
                    if(o.use_hash){
                        window.location.hash = _href;
                    } else {
                        history.pushState(null, null, _href);
                    }
                    fn.statechange(_href, _data);
                } else if($t.hasClass('js-simulate-pushstate')) {
                    e.stopImmediatePropagation();
                    fn.statechange(_href, _data);
                } else if($t.hasClass('js-do-popstate')) {
                    e.stopImmediatePropagation();
                    history.back();
                }
            },
            popstate: function(e, d) {
                if(o.use_hash){
                    fn.statechange(window.location.hash, d);
                } else {
                    fn.statechange(window.location.pathname, d);
                }
            },
            pushstate: function(e, d) {
                if(o.use_hash){
                    if(window.location.hash != d.pathname){
                        window.location.hash = d.pathname;
                    }
                } else {
                    if(window.location.pathname != d.pathname){
                        history.pushState(null, null, d.pathname);
                    }
                }
                if(!d || !d.prevent_propagation){
                    fn.statechange(d.pathname, d);
                }
            },
            simulate_pushstate: function(e, d) {
                if(!d || !d.prevent_propagation){
                    fn.statechange(d.pathname, d);
                }
            },
            hashchange: function(e, d) {
                if (!d || !d.prevent_propagation) {
                    fn.statechange(window.location.hash);
                }
            }
        };

        this.get_path_components = fn.get_path_components;

        fn.init();
        console.log(internal);
    };

    PushstateHelper.event_types = {
        PUSHSTATE_EVENT: 'navigationEvent:Pushstate'
    };

    PushstateHelper.get_path_components = function(path){
        var components, position;
        if(path){
            components = path.split('/');
            position = components.length;
            while(position--){
                if(!components[position].length){
                    components.splice(position,1);
                }
            }
            return components;
        }
    };

    PushstateHelper.get_get_params = function() {
        var d, get_str, get_components;
        d = {};
        get_str = window.location.search;
        if (!get_str || !get_str.length) {
            return d;
        }
        // first character is always '?'
        get_str = get_str.substring(1);
        get_components = get_str.split('&');
        $.each(get_components, function(i, component) {
            var pair;
            pair = component.split('=');
            if (pair.length) {
                d[pair[0]] = pair[1] ? pair[1] : null;
            }
        });
        return d;
    };

    return PushstateHelper;

});