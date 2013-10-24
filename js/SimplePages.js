define(['jquery', 'merlin-app/Merlin', 'merlin-app/App', 'merlin-app/PushstateHelper', 'globals'], function($, Merlin, App, PushstateHelper, globals) {

    var SimplePages = function(options) {

        var self = this, o, internal, elements, fn, handlers;

        o = $.extend({
            app: null,
            $e: null,
            selector: '',
            base_url: '',
            pages: {
                'page_name': {
                    route: '/',
                    selector: '.page-selector'
                }
            },
            page_transition: Merlin.default_step_transition,
            page_render: SimplePages.default_page_render,
            first_step: null,
            name: 'Pages'
        }, options);

        internal = {
            name: 'mod.Pages',
            $e: (o.$e ? o.$e : $(o.selector)),
            merlin: null,
            path_components: window.location.pathname.split('/'),
            current: window.location.pathname,
            next: null
        };

        elements = {
            body: $('body'),
            window: $(window),
        };

        fn = {
            init: function() {
                var first_step;

                internal.merlin = new Merlin({
                    name: 'Pages',
                    $e: internal.$e,
                    steps: fn.build_merlin_steps(),
                    transition: o.page_transition
                });

                first_step = fn.get_first_step();
                if (first_step) {
                    internal.merlin.show_step(first_step);
                }

                o.app.events.on(PushstateHelper.event_types.PUSHSTATE_EVENT, handlers.pushstate);

                o.app.events.on(App.event_types.FEATURES_INITIALIZED, function(){
                    globals.elements.window.trigger('pushstate', {
                        pathname: window.location.href
                    });
                });
            },
            get_first_step: function() {
                var first_step;
                if (o.first_step) {
                    return o.first_step;
                }
                first_step = internal.$e.data('first-step');
                if (first_step) {
                    return first_step;
                }
                return null;
            },
            build_merlin_steps: function() {
                var steps;
                steps = {};
                $.each(o.pages, function(k, page) {
                    var step = $.extend({}, page);
                    if ($.isFunction(page.init)) {
                        step.init = function(me, data) {
                            data.pages = self;
                            page.init.apply(this, [me, data]);
                        };
                    } else {
                        if (!page.autosync_on_visible) {
                            step.init = function(me, data) {
                                fn.load_page(this);
                            };
                        }
                    }
                    if ($.isFunction(page.visible)) {
                        step.visible = function(me, data) {
                            data.pages = self;
                            page.visible.apply(this, [me, data]);
                        };
                    } else {
                        if (page.autosync_on_visible) {
                            step.visible = function(me, data) {
                                fn.load_page(this);
                            };
                        }
                    }
                    if ($.isFunction(page.finish)) {
                        step.finish = function(me, data) {
                            data.pages = self;
                            page.finish.apply(this, [me, data]);
                        };
                    }
                    steps[k] = step;
                });
                return steps;
            },
            load_page: function(step, request_options, callback) {
                // if (!internal.next || (internal.next == internal.current)) {
                //     return;
                // }
                internal.current = internal.next;
                $.ajax({
                    url: internal.current,
                    data: $.extend({
                        requesting_merlin: o.name
                    }, request_options || {}),
                    success: function(data) {
                        if ($.isFunction(callback)) {
                            callback(data);
                        } else {
                            fn.render_page(step, data);
                        }
                    }
                });
            },
            render_page: function(step, html, callback) {
                o.page_render.apply(self, arguments);
            },
            update: function(path) {
                var page_name;

                $.each(o.pages, function(k, page) {
                    if (path.replace(o.base_url, '').match(page.route)) {
                        page_name = k;
                        internal.next = path;
                        return false;
                    }
                });

                if (page_name) {
                    internal.merlin.show_step(page_name);
                    fn.set_body_class(page_name);
                }
            },
            set_body_class: function(page_name) {
                elements.body.removeClass(function(i, classname) {
                    return (classname.match (/page-\S+/g) || []).join(' ');
                }).addClass('page-' + page_name);
            }
        };

        handlers = {
            pushstate: function(e, d) {
                if (SimplePages.has_path_changed(internal.path_components, d.components)) {
                    internal.path_components = d.components;
                    fn.update(d.path);
                }
            }
        };

        self.load_page = fn.load_page;

        fn.init();
        console.log(internal);
    };

    SimplePages.has_path_changed = function(current_components, next_components) {
        var changed = false;
        if (current_components.length != next_components.length) {
            return true;
        }
        $.each(next_components, function(i, component) {
            if (component != current_components[i]) {
                changed = true;
                return false;
            }
        });
        return changed;
    };

    SimplePages.default_page_render = function(step, html, callback) {
        if (html) {
            step.$e.html(html);
        }
        if ($.isFunction(callback)) {
            callback();
        }
    };

    return SimplePages;

});