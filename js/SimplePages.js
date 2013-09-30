define(['jquery', 'merlin-app/Merlin', 'merlin-app/PushstateHelper'], function($, Merlin, PushstateHelper) {

    var SimplePages = function(options) {

        var self = this, o, internal, elements, fn, handlers;

        o = $.extend({
            app: null,
            $e: null,
            selector: '',
            pages: {
                'page_name': {
                    route: '/',
                    selector: '.page-selector'
                }
            },
            page_transition: Merlin.default_step_transition,
            first_page: null
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
            body: $('body')
        };

        fn = {
            init: function() {
                internal.merlin = new Merlin({
                    name: 'Pages',
                    $e: internal.$e,
                    steps: fn.build_merlin_steps(),
                    transition: o.page_transition
                });

                internal.merlin.show_step(o.first_page);

                o.app.events.on(PushstateHelper.event_types.PUSHSTATE_EVENT, handlers.pushstate);
            },
            build_merlin_steps: function() {
                var steps;
                steps = {};
                $.each(o.pages, function(k, page) {
                    var step = {
                        route: page.route
                    };
                    if (page.$e) {
                        step.$e = page.$e;
                    } else {
                        step.selector = page.selector;
                    }
                    if ($.isFunction(page.init)) {
                        step.init = function(me, data) {
                            data.pages = self;
                            page.init.apply(this, [me, data]);
                        };
                    } else {
                        step.init = function(me, data) {
                            fn.load_page(this);
                        };
                    }
                    if ($.isFunction(page.visible)) {
                        step.visible = function(me, data) {
                            data.pages = self;
                            page.visible.apply(this, [me, data]);
                        };
                    } else {
                        step.visible = $.noop;
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
                if (!internal.next || (internal.next == internal.current)) {
                    return;
                }
                internal.current = internal.next;
                $.ajax({
                    url: internal.current,
                    data: $.extend({
                        pages_partial: true
                    }, request_options || {}),
                    success: function(data) {
                        if ($.isFunction(callback)) {
                            callback(data);
                        } else {
                            fn.render_page(step, $(data));
                        }
                    }
                });
            },
            render_page: function(step, $p, callback) {
                if ($p) {
                    step.$e.append($p);
                }
                if ($.isFunction(callback)) {
                    callback();
                }
            },
            update: function() {
                var path_components, page_name;
                path_components = internal.path_components;

                internal.next = path_components.join('/').replace('#', '');

                $.each(o.pages, function(k, page) {
                    if (internal.next.match(page.route)) {
                        page_name = k;
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
                    fn.update();
                }
            }
        };

        fn.init();
        console.log(internal);
    };

    SimplePages.has_path_changed = function(current_components, next_components) {
        var changed = false;
        $.each(next_components, function(i, component) {
            if (component != current_components[i]) {
                changed = true;
                return false;
            }
        });
        return changed;
    };

    return SimplePages;

});