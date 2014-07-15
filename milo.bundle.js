(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';


var _ = require('mol-proto');

module.exports = Facet;


/**
 * `milo.classes.Facet`
 * Base Facet class is an ancestor of [ComponentFacet](../components/c_facet.js.html) class, the main building block in milo.
 * 
 * @param {FacetedObject} owner an instance of FacetedObject subclass that stores the facet on its property  with the same name as `name` property of facet
 * @param {Object} config optional facet configuration, used in subclasses
 */
function Facet(owner, config) {
    this.name = _.firstLowerCase(this.constructor.name);
    this.owner = owner;
    this.config = config || {};
    this.init.apply(this, arguments);
}


/**
 * `init` method of subclass will be called by Facet constructor.
 */
_.extendProto(Facet, {
    init: function() {}
});

},{"mol-proto":109}],2:[function(require,module,exports){
'use strict';


var Facet = require('./facet')
    , _ = require('mol-proto')
    , check = require('../util/check')
    , Match = check.Match
    , FacetError = require('../util/error').Facet;

module.exports = FacetedObject;


/**
 * `milo.classes.FacetedObject`
 * Component class is based on an abstract ```FacetedObject``` class. This class can be used in any situation where objects can be represented via collection of facets (a facet is an object of a certain class, it holds its own configuration, data and methods).
 * In a way, "facets pattern" is an inversion of "adapter pattern" - while the latter allows finding a class/methods that has specific functionality, faceted object is simply constructed to have these functionalities.
 * With this architecture it is possible to create a virtually unlimited number of component classes with a very limited number of building blocks without having any hierarchy of classes - all components inherit directly from Component class.
 *
 * This constructor should be called by all subclasses constructor (it will happen automatically if a subclass is created with `_.createSubclass`).
 *
 * @return {FacetedObject}
 */
function FacetedObject() {
    // this.facetsConfig and this.facetsClasses were stored on a specific class prototype
    // when the class was created by FacetedObject.createFacetedClass
    var facetsConfig = this.facetsConfig || {};

    var facetsDescriptors = {}
        , facets = {};

    // FacetedObject class itself is not meant to be instantiated - it has no facets
    // It may change, as adding facets is possible to instances
    if (this.constructor == FacetedObject)      
        throw new FacetError('FacetedObject is an abstract class, can\'t be instantiated');

    // instantiate class facets
    if (this.facetsClasses)
        _.eachKey(this.facetsClasses, instantiateFacet, this, true);

    // add facets to the class as properties under their own name
    Object.defineProperties(this, facetsDescriptors);

    // store all facets on `facets` property so that they can be enumerated
    _.defineProperty(this, 'facets', facets);   

    // call `init`method if it is defined in subclass
    if (this.init)
        this.init.apply(this, arguments);

    // instantiate facet with a given class (FacetClass) and name (facetName)
    function instantiateFacet(FacetClass, facetName) {
        // get facet configuration
        var fctConfig = facetsConfig[facetName];

        // instatiate facets
        facets[facetName] = new FacetClass(this, fctConfig);

        // add facet to property descriptors
        facetsDescriptors[facetName] = {
            enumerable: true,
            value: facets[facetName]
        };
    }
}


/**
 * ####FacetedObject class methods####
 *
 * - [createFacetedClass](#FacetedObject$$createFacetedClass)
 * - [hasFacet](#FacetedObject$$hasFacet)
 */
_.extend(FacetedObject, {
    createFacetedClass: FacetedObject$$createFacetedClass,
    hasFacet: FacetedObject$$hasFacet,
    getFacetConfig: FacetedObject$$getFacetConfig
});


/**
 * ####FacetedObject instance methods####
 *
 * - [addFacet](#FacetedObject$addFacet)
 */
_.extendProto(FacetedObject, {
    addFacet: FacetedObject$addFacet
});


/**
 * FacetedObject instance method.
 * Adds a facet to the instance of FacetedObject subclass.
 * Returns an instance of the facet that was created.
 *
 * @param {Function} FacetClass facet class constructor
 * @param {Object} facetConfig optional facet configuration
 * @param {String} facetName optional facet name, FacetClass.name will be used if facetName is not passed.
 * @param {Boolean} throwOnErrors If set to false, then errors will only be logged to console. True by default.
 * @return {Facet}
 */
function FacetedObject$addFacet(FacetClass, facetConfig, facetName, throwOnErrors) {
    check(FacetClass, Function);
    check(facetName, Match.Optional(String));

    // first letter of facet name should be lowercase
    facetName = _.firstLowerCase(facetName || FacetClass.name);

    // get facets defined in class
    var protoFacets = this.constructor.prototype.facetsClasses;

    // check that this facetName was not already used in the class
    if (protoFacets && protoFacets[facetName])
        throw new FacetError('facet ' + facetName + ' is already part of the class ' + this.constructor.name);

    // check that this faceName does not already exist on the faceted object
    if (this[facetName]) {
        var message = 'facet ' + facetName + ' is already present in object';
        if (throwOnErrors === false)
            return logger.error('FacetedObject addFacet: ', message);
        else
            throw new FacetError(message);
    }

    // instantiate the facet
    var newFacet = this.facets[facetName] = new FacetClass(this, facetConfig);

    // add facet to faceted object
    _.defineProperty(this, facetName, newFacet, _.ENUM);

    return newFacet;
}


/**
 * FacetedObject class method
 * Returns reference to the facet class if the facet with `facetName` is part of the class, `undefined` otherwise. If subclass is created using _.createSubclass (as it should be) it will also have this method.
 * 
 * @param {Subclass(FacetedObject)} this this in this method refers to FacetedObject (or its subclass) that calls this method
 * @param {String} facetName
 * @return {Subclass(Facet)|undefined} 
 */
function FacetedObject$$hasFacet(facetName) {
    // this refers to the FacetedObject class (or subclass), not instance
    var protoFacets = this.prototype.facetsClasses;
    return protoFacets && protoFacets[facetName];
}

/**
 * FacetedObject class method
 * Return the configuration of a facet
 * @param {String} facetName the facet which config should be retrieved
 * @return {Object} the configuration object that was passed to the facet
 */
function FacetedObject$$getFacetConfig(facetName) {
    return this.hasFacet(facetName) ? this.prototype.facetsConfig[facetName] : null;
}


/**
 * FacetedObject class method
 * Class factory that creates classes (constructor functions) from the maps of facets and their configurations.
 * Created class will be subclass of `FacetedObject`.
 *
 * @param {Subclass(FacetedObject)} this this in this method refers to FacetedObject (or its subclass) that calls this method
 * @param {String} name class name (will be function name of class constructor function)
 * @param {Object[Subclass(Facet)]} facetsClasses map of classes of facets that will constitute the created class
 * @param {Object[Object]} facetsConfig map of facets configuration, should have the same keys as the map of classes. Some facets may not have configuration, but the configuration for a facet that is not included in facetsClasses will throw an exception
 * @return {Subclass(FacetedObject)}
 */
function FacetedObject$$createFacetedClass(name, facetsClasses, facetsConfig) {
    check(name, String);
    check(facetsClasses, Match.ObjectHash(Match.Subclass(Facet, true))); //TODO: does not allow new comp without config.
    check(facetsConfig, Match.Optional(Object));

    // throw exception if config passed for facet for which there is no class
    if (facetsConfig)
        _.eachKey(facetsConfig, function(fctConfig, fctName) {
            if (! facetsClasses.hasOwnProperty(fctName))
                throw new FacetError('configuration for facet (' + fctName + ') passed that is not in class');
        });

    // create subclass of the current class (this refers to the class that calls this method)
    var FacetedClass = _.createSubclass(this, name, true);

    // get facets classes and configurations from parent class
    facetsClasses = addInheritedFacets(this, facetsClasses, 'facetsClasses');
    facetsConfig = addInheritedFacets(this, facetsConfig, 'facetsConfig');

    // store facets classes and configurations of class prototype
    _.extendProto(FacetedClass, {
        facetsClasses: facetsClasses,
        facetsConfig: facetsConfig
    });

    return FacetedClass;


    function addInheritedFacets(superClass, facetsInfo, facetsInfoName) {
        var inheritedFacetsInfo = superClass.prototype[facetsInfoName];
        if (inheritedFacetsInfo)
            return _(inheritedFacetsInfo)
                    .clone()
                    .extend(facetsInfo)._();
        else
            return facetsInfo;
    }
};

},{"../util/check":88,"../util/error":94,"./facet":1,"mol-proto":109}],3:[function(require,module,exports){
'use strict';

var _ = require('mol-proto')
    , check = require('../util/check')
    , Match = check.Match
    , MixinError = require('../util/error').Mixin;


module.exports = Mixin;

/**
 * `milo.classes.Mixin` - an abstract Mixin class.
 * Can be subclassed using:
 * ```
 * var MyMixin = _.createSubclass(milo.classes.Mixin, 'MyMixin');
 * ```
 *
 * Mixin pattern is also used, but Mixin in milo is implemented as a separate object that is stored on the property of the host object and can create proxy methods on the host object if required.
 * Classes [Messenger](../messenger/index.js.html) and [MessageSource](../messenger/m_source.js.html) are subclasses of Mixin abstract class. `this` in proxy methods refers to Mixin instance, the reference to the host object is `this._hostObject`.
 *
 * @param {Object} hostObject Optional object where a Mixin instance will be stored on. It is used to proxy methods and also to find the reference when it is needed for host object implementation.
 * @param {Object} proxyMethods Optional map of proxy method names as keys and Mixin methods names as values, so proxied methods can be renamed to avoid name-space conflicts if two different Mixin instances with the same method names are put on the object
 * @param {List} arguments all constructor arguments will be passed to init method of Mixin subclass together with hostObject and proxyMethods
 * @return {Mixin}
 */
function Mixin(hostObject, proxyMethods) { // , other args - passed to init method
    check(hostObject, Match.Optional(Match.OneOf(Object, Function)));

    // store hostObject
    _.defineProperty(this, '_hostObject', hostObject);

    // proxy methods to hostObject
    if (proxyMethods)
        this._createProxyMethods(proxyMethods);

    // calling init if it is defined in the class
    if (this.init)
        this.init.apply(this, arguments);
}


/**
 * ####Mixin instance methods####
 * These methods are called by constructor, they are not to be called from subclasses.
 *
 * - [_createProxyMethod](#_createProxyMethod)
 * - [_createProxyMethods](#_createProxyMethods)
 */
_.extendProto(Mixin, {
    _createProxyMethod: _createProxyMethod,
    _createProxyMethods: _createProxyMethods
});


/**
 * Creates a proxied method of Mixin subclass on host object.
 *
 * @param {String} mixinMethodName name of method in Mixin subclass
 * @param {String} proxyMethodName name of created proxy method on host object
 * @param {Object} hostObject Optional reference to the host object; if not specified the host object passed to constructor wil be used. It allows to use the same instance of Mixin on two host objects.
 */
function _createProxyMethod(proxyMethodName, mixinMethodName, hostObject) {
    hostObject = hostObject || this._hostObject;

    // Mixin class does not allow shadowing methods that exist on the host object
    if (hostObject[proxyMethodName])
        throw new MixinError('method ' + proxyMethodName +
                                 ' already defined in host object');

    check(this[mixinMethodName], Function);

    // Bind proxied Mixin's method to Mixin instance
    var boundMethod = this[mixinMethodName].bind(this);

    _.defineProperty(hostObject, proxyMethodName, boundMethod, _.WRIT);
}


/**
 * Creates proxied methods of Mixin subclass on host object.
 *
 * @param {Hash[String]} proxyMethods map of names of methods, key - proxy method, value - mixin method.
 * @param {Object} hostObject an optional reference to the host object; if not specified the host object passed to constructor wil be used. It allows to use the same instance of Mixin on two host objects.
 */
function _createProxyMethods(proxyMethods, hostObject) {
    check(proxyMethods, Match.Optional(Match.OneOf([String], Match.ObjectHash(String))));

    // creating and binding proxy methods on the host object
    if (Array.isArray(proxyMethods))
        proxyMethods.forEach(function(methodName) {
            // method called this way to allow using _createProxyMethods with objects that are not inheriting from Mixin
            _createProxyMethod.call(this, methodName, methodName, hostObject);
        }, this);
    else
        _.eachKey(proxyMethods, function(mixinMethodName, proxyMethodName) {

            // method called this way to allow using _createProxyMethods with objects that are not inheriting from Mixin
            _createProxyMethod.call(this, proxyMethodName, mixinMethodName, hostObject);
        }, this);
}

},{"../util/check":88,"../util/error":94,"mol-proto":109}],4:[function(require,module,exports){
'use strict';

var _ = require('mol-proto')
    , RegistryError = require('../util/error').Registry
    , check = require('../util/check')
    , Match = check.Match;

module.exports = ClassRegistry;


/**
 * `milo.classes.ClassRegistry` - the registry of classes class.
 * Components and Facets register themselves in registries. It allows to avoid requiring them from one module and prevents circular dependencies between modules.
 * 
 * @param {Function} FoundationClass All classes that are registered in the registry should be subclasses of the FoundationClass
 * @return {Object}
 */
function ClassRegistry (FoundationClass) {
    if (FoundationClass)
        this.setClass(FoundationClass);

    this.__registeredClasses = {};
}


/**
 * ####ClassRegistry instance methods####
 *
 * - [add](#add)
 * - [get](#get)
 * - [remove](#remove)
 * - [clean](#clean)
 * - [setClass](#setClass)
 */
_.extendProto(ClassRegistry, {
    add: add,
    get: get,
    remove: remove,
    clean: clean,
    setClass: setClass
});


/**
 * ClassRegistry instance method that registers a class in the registry.
 * The method will throw an exception if a class is registered under the same name as previously registered class.
 * The method allows registering the same class under a different name, so class aliases can be created.
 *
 * @param {Function} aClass class to register in the registry. Should be subclass of `this.FoundationClass`.
 * @param {String} name Optional class name. If class name is not specified, it will be taken from constructor function name. Class name should be a valid identifier and cannot be an empty string.
 */
function add(aClass, name) {
    name = name || aClass.name;

    check(name, Match.IdentifierString, 'class name must be identifier string');

    if (this.FoundationClass) {
        if (aClass != this.FoundationClass)
            check(aClass, Match.Subclass(this.FoundationClass), 'class must be a sub(class) of a foundation class');
    } else
        throw new RegistryError('foundation class must be set before adding classes to registry');

    if (this.__registeredClasses[name])
        throw new RegistryError('class "' + name + '" is already registered');

    this.__registeredClasses[name] = aClass;
};


/**
 * Gets class from registry by name
 *
 * @param {String} name Class name
 * @return {Function}
 */
function get(name) {
    check(name, String, 'class name must be string');
    return this.__registeredClasses[name];
};


/**
 * Remove class from registry by its name.
 * If class is not registered, this method will throw an exception.
 * 
 * @param {String|Function} nameOrClass Class name. If class constructor is supplied, its name will be used.
 */
function remove(nameOrClass) {
    check(nameOrClass, Match.OneOf(String, Function), 'class or name must be supplied');

    var name = typeof nameOrClass == 'string'
                        ? nameOrClass
                        : nameOrClass.name;
                        
    if (! this.__registeredClasses[name])
        throw new RegistryError('class is not registered');

    delete this.__registeredClasses[name];
};


/**
 * Removes all classes from registry.
 */
function clean() {
    this.__registeredClasses = {};
};


/**
 * Sets `FoundationClass` of the registry. It should be set before any class can be added.
 *
 * @param {Function} FoundationClass Any class that will be added to the registry should be a subclass of this class. FoundationClass itself can be added to the registry too.
 */
function setClass(FoundationClass) {
    check(FoundationClass, Function);
    _.defineProperty(this, 'FoundationClass', FoundationClass, _.ENUM);
}

},{"../util/check":88,"../util/error":94,"mol-proto":109}],5:[function(require,module,exports){
'use strict';

var Attribute = require('./a_class')
    , AttributeError = require('../util/error').Attribute
    , config = require('../config')
    , _ = require('mol-proto')
    , check = require('../util/check')
    , Match = check.Match;


var ATTRIBUTE_REGEXP= /^([^\:\[\]]*)(?:\[([^\:\[\]]*)\])?\:?([^:]*)$/
    , FACETS_SPLIT_REGEXP = /\s*(?:\,|\s)\s*/
    , ATTRIBUTE_TEMPLATE = '%compClass%compFacets:%compName';


/**
 * `milo.attributes.bind`
 * BindAttribute class parses/validates/etc. an attribute that binds DOM elements to milo components.
 * Possible attribute values are:
 *
 * - `:myView` - only component name
 * - `View:myView` - class and component name
 * - `[Events, Data]:myView` - facets and component name
 * - `View[Events]:myView` - class, facet(s) and component name
 *
 * See [binder](../binder.js.html) for more information.
 */
var BindAttribute = _.createSubclass(Attribute, 'BindAttribute', true);


/**
 * ####BindAttribute instance methods####
 *
 * - [attrName](#attrName)
 * - [parse](#parse)
 * - [validate](#validate)
 * - [render](#render)
 */
_.extendProto(BindAttribute, {
    attrName: attrName,
    parse: parse,
    validate: validate,
    render: render
});


module.exports = BindAttribute;


/**
 * BindAttribute instance method that returns attribute name, by default - `'ml-bind'`.
 * To configure bind attribute name use:
 * ```
 * milo.config({ attrs: { bind: 'cc-bind' } }); // will set bind attribute to 'cc-bind'
 * ```
 *
 * @return {String}
 */
function attrName() {
    return config.attrs.bind;
}


/**
 * BindAttribute instance method that parses bind attribute if it is present on the element.
 * It defines properties `compClass`, `compFacets` and `compName` on BindAttribute instance.
 * Returns the instance for method chaining.
 *
 * @return {BindAttribute}
 */
 function parse() {
    if (! this.node) return;

    var value = this.get();

    if (value)
        var bindTo = value.match(ATTRIBUTE_REGEXP);

    if (! bindTo)
        throw new AttributeError('invalid bind attribute ' + value);

    this.compClass = bindTo[1] || 'Component';
    this.compFacets = (bindTo[2] && bindTo[2].split(FACETS_SPLIT_REGEXP)) || undefined;
    this.compName = bindTo[3] || undefined; // undefined is not same as ''

    return this;
}


/**
 * BindAttribute instance method that validates bind attribute, throws if it has an invalid value.
 * Returns the instance for method chaining.
 *
 * @return {BindAttribute}
 */
function validate() {
    check(this.compName, Match.IdentifierString);

    if (! this.compClass)
        throw new AttributeError('empty component class name ' + this.compClass);

    return this;
}


/**
 * BindAttribute instance method that returns the attribute value for given values of properties `compClass`, `compName` and `compFacets`.
 * If `this.compName` is not set it will be generated automatically.
 *
 * @return {String}
 */
function render() {
    this.compName = this.compName || milo.util.componentName();
    return ATTRIBUTE_TEMPLATE
                .replace('%compClass', this.compClass || '')
                .replace('%compFacets', this.compFacets && this.compFacets.length
                                            ? '[' + this.compFacets.join(', ') + ']'
                                            : '')
                .replace('%compName', this.compName);
}

},{"../config":64,"../util/check":88,"../util/error":94,"./a_class":6,"mol-proto":109}],6:[function(require,module,exports){
'use strict';

var _ = require('mol-proto')
    , check = require('../util/check')
    , Match = check.Match
    , toBeImplemented = require('../util/error').toBeImplemented;


module.exports = Attribute;


/**
 * An absctract class for parsing and validation of element attributes.
 * Subclasses should define methods `attrName`, `parse`, `validate` and `render`.
 *
 * @param {Element} el DOM element where attribute is attached
 * @param {String} name Optional name of the attribute, usually supplied by subclass via `attrName` method
 */
function Attribute(el, name) {
    this.name = name || this.attrName();
    this.el = el;

    // attribute node
    this.node = el.attributes[this.name];
}


_.extend(Attribute, {
    remove: Attribute$$remove
});


/**
 * ####Attribute instance methods####
 *
 * - [get](#Attribute$get)
 * - [set](#Attribute$set)
 * - [decorate](#Attribute$decorate)
 *
 * The following instance methods should be defined by subclass
 *
 * - attrName - should return attribute name
 * - parse - should parse attribute value
 * - validate - should validate attribute value, throwing exception if it is incorrect 
 * - render - should return attribute value for a given attribute state (other properties, as defined in subclass)
 */
_.extendProto(Attribute, {
    get: Attribute$get,
    set: Attribute$set,
    remove: Attribute$remove,
    decorate: Attribute$decorate,

    destroy: Attribute$destroy,

    // should be defined in subclass
    attrName: toBeImplemented,
    parse: toBeImplemented,
    validate: toBeImplemented,
    render: toBeImplemented
});


function Attribute$$remove(el, deep) {
    var name = this.prototype.attrName();
    el.removeAttribute(name);

    if (deep) {
        var selector = '[' + name + ']';
        var children = el.querySelectorAll(selector);
        _.forEach(children, function(childEl) {
            childEl.removeAttribute(name);
        })
    }
}


function Attribute$remove() {
    delete this.node;
}


function Attribute$destroy() {
    delete this.el;
    delete this.node;
}

/**
 * Attribute instance method that returns attribute value as string.
 *
 * @return {String}
 */
function Attribute$get() {
    return this.el.getAttribute(this.name);
}


/**
 * Attribute instance method that sets attribute value.
 *
 * @param {String} value
 */
function Attribute$set(value) {
    this.el.setAttribute(this.name, value);
}


/**
 * Attribute instance method that decorates element with its rendered value.
 * Uses `render` method that should be defiend in subclass.
 */
function Attribute$decorate() {
    this.set(this.render());
}

},{"../util/check":88,"../util/error":94,"mol-proto":109}],7:[function(require,module,exports){
'use strict';

var Attribute = require('./a_class')
    , AttributeError = require('../util/error').Attribute
    , config = require('../config')
    , _ = require('mol-proto');


/**
 * `milo.attributes.load`
 * LoadAttribute class parses/validates/etc. an attribute that loads sub-views into the page.
 * Attribute value should be URL of the file to load subview from.
 * See [loader](../loader.js.html) for more information.
 */
var LoadAttribute = _.createSubclass(Attribute, 'LoadAttribute', true);


/**
 * ####LoadAttribute instance methods####
 *
 * - [attrName](#attrName)
 * - [parse](#parse)
 * - [validate](#validate)
 * - [render](#render)
 */
_.extendProto(LoadAttribute, {
    attrName: attrName,
    parse: parse,
    validate: validate,
    render: render
});

module.exports = LoadAttribute;


/**
 * BindAttribute instance method that returns attribute name, by default - `'ml-load'`.
 * To configure load attribute name use:
 * ```
 * milo.config({ attrs: { load: 'cc-load' } }); // will set bind attribute to 'cc-load'
 * ```
 *
 * @return {String}
 */
function attrName() {
    return config.attrs.load;
}


/**
 * LoadAttribute instance method that parses load attribute if it is present on the element.
 * It defines property `loadUrl` on LoadAttribute instance.
 * Returns the instance for method chaining.
 *
 * @return {LoadAttribute}
 */
function parse() {
    if (! this.node) return;

    this.loadUrl = this.get();
    return this;
}


/**
 * LoadAttribute instance method that should validate load attribute and throw if it has an invalid value.
 * TODO - implement url validation.
 * Returns the instance for method chaining.
 *
 * @return {LoadAttribute}
 */
function validate() {
    // TODO url validation
    return this;
}


/**
 * LoadAttribute instance method - returns URL
 *
 * @return {String}
 */
function render() {
    return this.loadUrl;
}

},{"../config":64,"../util/error":94,"./a_class":6,"mol-proto":109}],8:[function(require,module,exports){
'use strict';

/**
 * Subclasses of [Attribute](./a_class.js.html) class
 *
 * - [BindAttribute](./a_bind.js.html)
 * - [LoadAttribute](./a_load.js.html)
 */
var attributes = module.exports = {
    bind: require('./a_bind'),
    load: require('./a_load')
};

},{"./a_bind":5,"./a_load":7}],9:[function(require,module,exports){
'use strict';

var miloMail = require('./mail')
    , componentsRegistry = require('./components/c_registry')
    , facetsRegistry = require('./components/c_facets/cf_registry')
    , Component = componentsRegistry.get('Component')
    , ComponentInfo = require('./components/c_info')
    , Scope = require('./components/scope')
    , BindAttribute = require('./attributes/a_bind')
    , BinderError = require('./util/error').Binder
    , _ = require('mol-proto')
    , check = require('./util/check')
    , utilDom = require('./util/dom')
    , Match =  check.Match;


binder.scan = scan;
binder.create = create;
binder.twoPass = twoPass;


module.exports = binder;


/**
 * `milo.binder`
 *
 * Recursively scans the document tree inside `scopeEl` (document.body by default) looking for __ml-bind__ attribute that should contain the class, additional facets and the name of the component that should be created and bound to the element.
 *
 * Possible values of __ml-bind__ attribute:
 *
 * - `:myView` - only component name. An instance of Component class will be created without any facets.
 * - `View:myView` - class and component name. An instance of View class will be created.
 * - `[Events, Data]:myView` - facets and component name. An instance of Component class will be created with the addition of facets Events and Data.
 * - `View[Events, Data]:myView` - class, facet(s) and component name. An instance of View class will be created with the addition of facets Events and Data.
 *
 * Function returns an instance of [`Scope`](./components/scope.js.html) class containing all components created as a result of scanning DOM.
 *
 * If the component has [`Container`](./components/c_facets/Container.js) facet, children of this element will be stored in the `scope` object, available as scope property on the Container facet of this component. Names of components within the scope should be unique, but they can be the same as the names of components in outer scope (or some other scope).
 *
 * @param {Element} scopeEl root element inside which DOM will be scanned and bound
 * @param {Scope} rootScope Optional Root scope object where top level components will be saved.
 * @param {Boolean} bindRootElement If set to false, then the root element will not be bound. True by default.
 * @param {Boolean} throwOnErrors If set to false, then errors will only be logged to console. True by default.
 * @return {Scope}
 */
function binder(scopeEl, rootScope, bindRootElement, throwOnErrors) {
    return createBinderScope(scopeEl, function(scope, el, attr, throwOnErrors) {
        var info = new ComponentInfo(scope, el, attr, throwOnErrors);
        return Component.create(info, throwOnErrors);
    }, rootScope, bindRootElement, throwOnErrors);
}


// bind in two passes
function twoPass(scopeEl, rootScope, bindRootElement, throwOnErrors) {
    var scanScope = binder.scan(scopeEl, rootScope, bindRootElement, throwOnErrors);
    return binder.create(scanScope, undefined, throwOnErrors);
}


// scan DOM for BindAttribute
function scan(scopeEl, rootScope, bindRootElement, throwOnErrors) {
    return createBinderScope(scopeEl, function(scope, el, attr, throwOnErrors) {
        return new ComponentInfo(scope, el, attr, throwOnErrors);
    }, rootScope, bindRootElement, throwOnErrors);
}


// create bound components
function create(scanScope, hostObject, throwOnErrors) {
    var scope = new Scope(scanScope._rootEl, hostObject)
        , addMethod = throwOnErrors === false ? '_safeAdd' : '_add';

    scanScope._each(function(compInfo) {
        // set correct component's scope
        var info = _.clone(compInfo)
        info.scope = scope;

        // create component
        var aComponent = Component.create(info, throwOnErrors);

        scope[addMethod](aComponent, aComponent.name);
        if (aComponent.container)
            aComponent.container.scope = create(compInfo.container.scope, aComponent.container, throwOnErrors);
    });

    return scope;
}

/**
 * `createBinderScope`
 * @param  {Element} scopeEl             scopeEl root element inside which DOM will be scanned and bound (document.body by default).
 * @param  {Function} scopeObjectFactory See [binder](#milo.binder)
 * @param  {Scope} rootScope             Optional Root scope object where top level components will be saved.
 * @param  {Boolean} bindRootElement     If set to false, then the root element will not be bound. True by default.
 * @param  {Boolean} throwOnErrors       If set to false, then errors will only be logged to console. True by default.
 * @return {Scope}                       [description]
 */
function createBinderScope(scopeEl, scopeObjectFactory, rootScope, bindRootElement, throwOnErrors) {
    var scopeEl = scopeEl || document.body
        , scope = rootScope || new Scope(scopeEl)
        , addMethod = throwOnErrors === false ? '_safeAdd' : '_add';

    createScopeForElement(scope, scopeEl, bindRootElement);

    return scope;


    function createScopeForElement(scope, el, bindRootElement) {
        // get element's binding attribute (ml-bind by default)
        var attr = new BindAttribute(el);

        // if element has bind attribute crate scope object (Component or ComponentInfo)
        if (attr.node && bindRootElement !== false) {
            var scopedObject = scopeObjectFactory(scope, el, attr, throwOnErrors)
                , isContainer = typeof scopedObject != 'undefined' && scopedObject.container;
        }

        // if there are childNodes add children to new scope if this element has component with Container facet
        // otherwise create a new scope
        if (el.childNodes && el.childNodes.length) {
            if (isContainer) {
                var innerScope = new Scope(el);
                scopedObject.container.scope = innerScope;
                innerScope._hostObject = scopedObject.container;
            }

            createScopeForChildren(el, isContainer ? innerScope : scope);
        }

        // if scope wasn't previously created on container facet, create empty scope anyway
        if (isContainer && ! scopedObject.container.scope)
            scopedObject.container.scope = new Scope(el);


        // TODO condition after && is a hack, should not be used!
        if (scopedObject) // && ! scope[attr.compName])
            scope[addMethod](scopedObject, attr.compName);

        // _.defer(postChildrenBoundMessage, el);
        postChildrenBoundMessage(el);

        return scopedObject;


        function postChildrenBoundMessage(el) {
            var elComp = Component.getComponent(el);

            if (elComp)
                elComp.postMessageSync('childrenbound');
        }
    }


    function createScopeForChildren(containerEl, scope) {
        var children = utilDom.children(containerEl);

        _.forEach(children, function(node) {
            createScopeForElement(scope, node, true);
        });
        return scope;
    }
}

},{"./attributes/a_bind":5,"./components/c_facets/cf_registry":31,"./components/c_info":32,"./components/c_registry":33,"./components/scope":41,"./mail":66,"./util/check":88,"./util/dom":91,"./util/error":94,"mol-proto":109}],10:[function(require,module,exports){
'use strict';

// <a name="classes"></a>
// milo.classes
// -----------

// This module contains foundation classes and class registries.

var classes = {
    Facet: require('./abstract/facet'),
    FacetedObject: require('./abstract/faceted_object'),
    Scope: require('./components/scope'),
    ClassRegistry: require('./abstract/registry'),
    Mixin: require('./abstract/mixin'),
    MessageSource: require('./messenger/m_source'),
    MessengerAPI: require('./messenger/m_api'),
    DOMEventsSource: require('./components/msg_src/dom_events'),
    Transaction: require('./command/transaction'),
    TransactionHistory: require('./command/transaction_history')
};

module.exports = classes;

},{"./abstract/facet":1,"./abstract/faceted_object":2,"./abstract/mixin":3,"./abstract/registry":4,"./command/transaction":14,"./command/transaction_history":15,"./components/msg_src/dom_events":39,"./components/scope":41,"./messenger/m_api":70,"./messenger/m_source":72}],11:[function(require,module,exports){
'use strict';


var _ = require('mol-proto')
    , logger = require('../util/logger');


module.exports = ActionsHistory;


/**
 * Stores list of commands or transactions
 *
 * @constructor
 * @param {Number} maxLength
 */
function ActionsHistory(maxLength) {
    this._maxLength = maxLength || Infinity;
    this.actions = [];
    this.position = 0;
}


_.extendProto(ActionsHistory, {
    store: ActionsHistory$store,
    deleteLast: ActionsHistory$deleteLast,
    undo: ActionsHistory$undo,
    redo: ActionsHistory$redo,
    undoAll: ActionsHistory$undoAll,
    redoAll: ActionsHistory$redoAll,
    undoAllAsync: ActionsHistory$undoAllAsync,
    redoAllAsync: ActionsHistory$redoAllAsync,
    each: ActionsHistory$each,
    eachReverse: ActionsHistory$eachReverse,
    getLastAction: ActionsHistory$getLastAction,

    getDescription: ActionsHistory$getDescription
});


function ActionsHistory$store(command) {
    _truncateToCurrentPosition.call(this);
    this.actions.push(command);

    if (this.actions.length > this._maxLength) {
        var act = this.actions.shift();
        act.destroy();
    }

    this.position = this.actions.length;
    return this.position - 1
}


function ActionsHistory$deleteLast() {
    if (!this.actions.length) return;
    this.position--;
    this.actions.length--;
}


function _truncateToCurrentPosition() {
    for (var i = this.position; i < this.actions.length; i++)
        this.actions[i].destroy();
    this.actions.length = this.position;
}


function ActionsHistory$undo(cb) {
    if (this.position == 0) return; // nothing to undo
    var act = this.actions[--this.position];
    act.undo(cb);
}


function ActionsHistory$redo(cb) {
    if (this.position == this.actions.length) return; // nothing to redo
    var act = this.actions[this.position++];
    act.redo(cb);
}


function ActionsHistory$undoAll() {
    while (this.position) this.undo();
}


function ActionsHistory$redoAll() {
    while (this.position < this.actions.length) this.redo();
}


function ActionsHistory$undoAllAsync(cb) {
    if (this.position) {
        this.undo();
        if (this.position)
            _.deferMethod(this, 'undoAllAsync', cb);
        else
            if (cb) _.defer(cb);
    }
}


function ActionsHistory$redoAllAsync(cb) {
    if (this.position < this.actions.length) {
        this.redo();
        if (this.position < this.actions.length) 
            _.deferMethod(this, 'redoAllAsync', cb);
        else
            if (cb) _.defer(cb);
    }
}


function ActionsHistory$each(funcOrMethod, thisArg) {
    var func = typeof funcOrMethod == 'string'
                ? function(act) { act[funcOrMethod](); }
                : funcOrMethod;

    this.actions.forEach(func, thisArg || this);
}


function ActionsHistory$eachReverse(funcOrMethod, thisArg) {
    this.actions.reverse();
    this.each(funcOrMethod, thisArg);
    this.actions.reverse();
}


function ActionsHistory$getLastAction() {
    return this.position && this.actions[this.position - 1];
}


function ActionsHistory$getDescription() {
    var actions = this.actions.map(function(act) {
        return act.getDescription();
    });
    return {
        actions: actions,
        position: this.position,
        length: actions.length
    };
}

},{"../util/logger":98,"mol-proto":109}],12:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../abstract/registry')
    , Command = require('./index');

/**
 * `milo.registry.components`
 * An instance of [ClassRegistry](../abstract/registry.js.html) class that is used by milo to register and find components.
 */
var commandsRegistry = new ClassRegistry(Command);

// add common ancestor to all components to the registry.
commandsRegistry.add(Command);

module.exports = commandsRegistry;

},{"../abstract/registry":4,"./index":13}],13:[function(require,module,exports){
'use strict';


var _ = require('mol-proto')
    , check = require('../util/check')
    , Match = check.Match
    , logger = require('../util/logger');


var UNDO_COMMAND = '_undoCommand';


module.exports = Command;


/**
 * Command class to implement "command pattern" - packaging ll information necessary for delayed method execution
 *
 * @constructor
 * @param {Function} func method name or function to be executed
 * @param {List} *arguments parameters to be passed to method or function
 */
function Command(func) { // , ... arguments
    this.init.apply(this, arguments);
}


/**
 * Command instance methods
 * 
 * - [init](#Command$execute) - initialize command, should be overwritten by subclasses
 * - [execute](#Command$execute) - execute command
 * - [setUndo](#Command$setUndo) - set undo command for this command
 * - [getUndo](#Command$getUndo) - get undo command of this command
 * - [setArguments](#Command$setArguments) - set commands arguments
 * - [addArguments](#Command$addArguments) - add arguments to command
 * - [destroy](#Command$destroy)
 */
_.extendProto(Command, {
    init: Command$init,
    execute: Command$execute,
    setUndo: Command$setUndo,
    getUndo: Command$getUndo,
    undo: Command$undo,
    redo: Command$execute, // same for command, different for transaction
    setArguments: Command$setArguments,
    addArguments: Command$addArguments,
    getArguments: Command$getArguments,
    changeArguments: Command$changeArguments,
    destroy: Command$destroy,

    setComment: Command$setComment,
    getDescription: Command$getDescription
});


/**
 * Command class methods
 *
 * - [create](#Command$$create) - commands factory
 */
_.extend(Command, {
    create: Command$$create,
    createWithUndo: Command$$createWithUndo
});


function Command$init(func) { // , ... arguments
    check(func, Match.Optional(Function));
    this.func = func || function(){};
    this.args = _.slice(arguments, 1);    
}


/**
 * Execute command making command object available via function property. 
 */
function Command$execute(cb) {
    var result = this.func.apply(this, this.args);
    if (cb) _.defer(cb);
    return result;
}


/**
 * Set undo command for this command. This command becomes undo command for undo command (so undo command can change this command during its execution).
 * 
 * @param {Command} undoCommand
 */
function Command$setUndo(undoCommand) {
    if (this[UNDO_COMMAND])
        logger.warn('Command setUndo: undo command is already set');

    this[UNDO_COMMAND] = undoCommand;
    undoCommand[UNDO_COMMAND] = this;
}


/**
 * Returns undo command of a given command
 *
 * @return {Command}
 */
function Command$getUndo() {
    return this[UNDO_COMMAND];
}


/**
 * Executes undo command of current command
 */
function Command$undo(cb) {
    var undoCmd = this.getUndo();
    if (! undoCmd) return logger.error('Command undo called without undo command present');
    var result = undoCmd.execute();
    if (cb) _.defer(cb);
    return result;
}


/**
 * Set command's arguments. If arguments were set during command's creation, this method will overwrite arguments and log warning.
 *
 * @param {List} *arguments
 */
function Command$setArguments() { //, ... arguments
    if (this.args && this.args.length)
        logger.warn('Command setArguments: command arguments are already set');
    this.args = _.toArray(arguments);
}


function Command$getArguments() {
    return this.args;
}


function Command$changeArguments() { //, ... arguments
    this.args = _.toArray(arguments);
}


/**
 * Add (append) arguments to command
 *
 * @param {List} *arguments arguments list to be appended to command
 */
function Command$addArguments() { //, ... arguments
    if (! this.args) this.args = [];
    _.appendArray(this.args, arguments);
}


/**
 * Commands factory. Likely ot be overridden by subclasses to implement custom logic of command construction
 * 
 * @this {Function} Class of command
 * @param {Function} func method name or function to be executed
 * @param {List} *arguments parameters to be passed to method or function
 * @return {Command}
 */
function Command$$create(func) { // , ... arguments
    return _.newApply(this, arguments);
}


function Command$$createWithUndo() {
    throw new Error('createWithUndo should be implemented by subsclass');
}


/**
 * Destroy current command (to prevent potential memory leaks when commands point to DOM elements)
 */
function Command$destroy() {
    delete this.func;
    delete this.args;
    var undoCmd = this[UNDO_COMMAND];
    if (undoCmd) {
        delete this[UNDO_COMMAND][UNDO_COMMAND];
        delete this[UNDO_COMMAND];
        undoCmd.destroy();
    }
}


function Command$setComment(comment) {
    this.comment = comment;
}


function Command$getDescription() {
    return {
        func: this.func.name,
        comment: this.comment
    };
}

},{"../util/check":88,"../util/logger":98,"mol-proto":109}],14:[function(require,module,exports){
'use strict';


var ActionsHistory = require('./actions_history')
    , _ = require('mol-proto');


module.exports = Transaction;


function Transaction() {
    this.commands = new ActionsHistory;
}


_.extendProto(Transaction, {
    execute: Transaction$execute,
    undo: Transaction$undo,
    redo: Transaction$redo,
    destroy: Transaction$destroy,
    storeCommand: Transaction$storeCommand,
    merge: Transaction$merge,

    setComment: Transaction$setComment,
    getDescription: Transaction$getDescription
});


function Transaction$execute() {
    this.commands.each('execute');
}


function Transaction$undo(cb) {
    this.commands.undoAllAsync(cb);
}


function Transaction$redo(cb) {
    this.commands.redoAllAsync(cb);
}


function Transaction$destroy() {
    this.commands.each('destroy');
}


function Transaction$storeCommand(command) {
    this.commands.store(command);
}


function Transaction$merge(transaction) {
    transaction.commands.each(function(cmd) {
        this.commands.store(cmd);
    }, this);
}


function Transaction$setComment(comment) {
    this.comment = comment
}


function Transaction$getDescription() {
    var commands = this.commands.getDescription();
    return {
        commands: commands.actions,
        comment: this.comment
    }
}

},{"./actions_history":11,"mol-proto":109}],15:[function(require,module,exports){
'use strict';


var ActionsHistory = require('./actions_history')
    , Transaction = require('./transaction')
    , logger = require('../util/logger')
    , _ = require('mol-proto');


module.exports = TransactionHistory;


var SCHEDULED = '_scheduled';


function TransactionHistory(maxLength) {
    this.transactions = new ActionsHistory(maxLength);
    this.currentBatch = undefined;
    this.currentTransaction = undefined;
    this[SCHEDULED] = false;
}


_.extendProto(TransactionHistory, {
    storeCommand: TransactionHistory$storeCommand,
    endTransaction: TransactionHistory$endTransaction,
    storeTransaction: TransactionHistory$storeTransaction,
    deleteLastTransaction: TransactionHistory$deleteLastTransaction,
    undo: TransactionHistory$undo,
    redo: TransactionHistory$redo,
    inTransaction: TransactionHistory$inTransaction,

    getDescription: TransactionHistory$getDescription
});


/**
 * Stores command in the history. 
 * @param {Command} command           
 * @param {Boolean} appendTransaction If `true`, appends to the current or previous transaction if there is no current transaction.
 */
function TransactionHistory$storeCommand(command, appendTransaction) {
    if (appendTransaction && !(this.currentTransaction || this.currentBatch)) {
        var transaction = this.transactions.getLastAction();
        transaction.storeCommand(command);
        return;
    }

    if (! this.currentBatch) this.currentBatch = new Transaction;
    this.currentBatch.storeCommand(command);
    if (! this[SCHEDULED]) {
        this[SCHEDULED] = true;
        _.deferMethod(this, _storeTransaction);
    }
}


function TransactionHistory$deleteLastTransaction() {
    if (this.currentBatch || this.currentTransaction) {
        this.currentBatch = undefined;
        this.currentTransaction = undefined;
    } else {
        this.transactions.deleteLast();
    }
}


function _storeTransaction() {
    if (this.currentBatch) {
        _addBatchToTransaction.call(this);
        _.deferMethod(this, _storeTransaction);
    } else {
        _storeCurrentTransaction.call(this);
        this[SCHEDULED] = false;
    }
}


function TransactionHistory$endTransaction() {
    _addBatchToTransaction.call(this);
    _storeCurrentTransaction.call(this);
}


function _addBatchToTransaction() {
    if (this.currentBatch) {
        if (! this.currentTransaction) this.currentTransaction = new Transaction;
        this.currentTransaction.merge(this.currentBatch);
        this.currentBatch = undefined;
    } 
}


function _storeCurrentTransaction() {
    if (this.currentTransaction) {
        this.transactions.store(this.currentTransaction);
        this.currentTransaction = undefined;
    }
}


function TransactionHistory$storeTransaction(transaction) {
    this.endTransaction();
    this.transactions.store(transaction);
}


function TransactionHistory$undo(cb) {
    this.transactions.undo(cb);
}


function TransactionHistory$redo(cb) {
    this.transactions.redo(cb);
}


function TransactionHistory$inTransaction() {
    return this[SCHEDULED];
}


function TransactionHistory$getDescription() {
    return this.transactions.getDescription();
}

},{"../util/logger":98,"./actions_history":11,"./transaction":14,"mol-proto":109}],16:[function(require,module,exports){
'use strict';


var FacetedObject = require('../abstract/faceted_object')
    , facetsRegistry = require('./c_facets/cf_registry')
    , ComponentFacet = facetsRegistry.get('ComponentFacet')
    , componentUtils = require('./c_utils')
    , Messenger = require('../messenger')
    , _ = require('mol-proto')
    , check = require('../util/check')
    , Match = check.Match
    , config = require('../config')
    , miloComponentName = require('../util/component_name')
    , logger = require('../util/logger')
    , domUtils = require('../util/dom')
    , ComponentError = require('../util/error').Component
    , BindAttribute = require('../attributes/a_bind')
    , Scope = require('./scope')
    , DOMStorage = require('../util/storage')
    , jsonParse = require('../util/json_parse');

var _makeComponentConditionFunc = componentUtils._makeComponentConditionFunc;


/**
 * `milo.Component`
 * Base Component class. Subclass of [FacetedObject](../abstract/faceted_object.js.html), but none of this class methods should be directly used with component.
 * Its constructor passes its parameters, including its [scope](./scope.js.html), DOM element and name to [`init`](#init) method.
 * The constructor of Component class rarely needs to be used directly, as [milo.binder](../binder.js.html) creates components when it scans DOM tree.
 * [`Component.createComponentClass`](#createComponentClass) should be used to create a subclass of Component class with configured facets.
 *
 *
 * ####Component instance properties####
 *
 * - el - DOM element that component is attached to. If the second component is attached to the same DOM element, the warning will be logged to console. To get component reference from DOM element use [Component.getComponent](./c_utils.js.html#getComponent) class method. To inspect component via element in browser check `___milo_component` property of element (property name be changed using `milo.config`).
 * - scope - parent scope object, an instance of [Scope](./scope.js.html) class. To get parent component use [getScopeParent](#Component$getScopeParent) instance method of component. The actual path to get parent of conponent is `component.scope._hostObject.owner`, where `_hostObject` refers to [Container](c_facets/Container.js.html) facet of parent component and `owner` to the parent itself. The children of component are accessible via the scope of its container facet: `component.container.scope`. The scope hierarchy can be the same or different as the DOM hierarchy - DOM children of the component will be on the same scope as component if it does not have `Container` facet and in the scope of its Container facet if it has it. See [Scope](./scope.js.html).
 * - name - the name of component, should be unique for the scope where component belongs. To find component in scope the component's name should be used as property of scope object. See [Scope](./scope.js.html).
 * - facets - map of references of all component's facets (facet names are lowercase in this map). All facets can be accessed directly as properties of component, this property can be used to iterate facets (it is used in this way in [allFacets](#Component$allFacets) component's instance method that allows to call method with the same name on all facets).
 * - extraFacets - an array of names of facets that are added to component and do not form the part of component's class.
 * - _messenger - the reference to component's [messenger](../messenger/index.js.html). Rarely needs to be used directly as all commonly used methods of mesenger are available directly on component.
 *
 *
 * ####Component events####
 *
 * - 'childrenbound' - synchronously dispatched when children of DOM element which compnent is connected to are connected to components. The event is dispatched when component is created with `milo.binder` (as is almost always the case, as all Component class methods that create/copy components use `milo.binder` internally - component constructor and Component.create methods are not used in framework outside of `milo.binder` and rarely if ever need to be used in aplication).
 * - 'addedtoscope' - synchronously dispatched when component is added to scope.
 * - 'stateready' - aynchronously dispatched when component (together with its scope children) is created with [Component.createFromState](#Component$$createFromState) (or `createFromDataTransfer`) method. Can be dispatched by application if the component's state is set with some other mechanism. This event is not used in `milo`, it can be used in application in particular subclasses of component.
 * - 'getstatestarted' - emitted synchronously just before getState executes so components and facets can clean up their state for serialization. 
 * - 'getstatecompleted' - emitted asynchronously after getState executes so components and facets can restore their state after serialization.
 *
 *
 * ####Component "lifecycle"####
 *
 * 1. Component constructor is called. Component's constructor simply calls constructor of [FacetedObject](../abstract/faceted_object.js.html) that is a superclass of Component. Subclasses of Component should not implement their own constructor, they can optionally implement `init` method, but most components do not need to do it.
 * 2. constructors and `init` methods of all facets are called in sequence. Same as components, facet do not implement their constructors, they can optionally implement `init` and `start` methods (see below). Inside `init` method there should be only general initialization code without any dependency on component itself (it is not ready yet) and other facets (as there is no specific facets creation order). If facet implements `init` method it MUST call inherited init with `ComponentFacet.prototype.init.apply(this, arguments)`.
 * 3. `init` method of component is called. At this point all facets are created but facets still can be not ready as they can have initialization code in `start` method. If component subclass implements `init` method it MUST call inherited method with `<Superclass>.prototype.init.apply(this, arguments)`, where <Superclass> is Component or another superclass the component is a subclass of.
 * 4. `check` method of all facets is called. This method adds facets that are not part of the component declaration (being part of the class or explicitely listed in bind attribute) but are required by facets that the compnent already has. Subclasses of [ComponentFacet](./c_facet.js.html) do not need to implement this method.
 * 5. `start` method of all facets is called. This method is usually implemented by ComponentFacet subclasses and it can have any initialization code that depends on component or on other facets that are the dependencies of a facet. Inherited `start` method should be called int he same way as written above.
 * 6. `start` method of component is called. This component method can be implemented by subclasses if they need to have some initialization code that depends on some facets and requires that these facets are fully inialized. Often such code also depends on component's scope children as well so this code should be inside `'childrenbound'` event subscriber.
 * 7. 'addedtoscope' event is dispatched when component is added to its parent's scope or to top level scope created by `milo.binder`.
 * 8. component's children are created (steps 1-6 above are followed for each child).
 * 9. 'childrenbound' event is dispatched when all component's children are created and added to their scope (see event description below).
 * 10. 'stateready' event is dispatched for component and all its children when component is create from state (see event description below).
 * 11. at this point component is in the "interactive" state when it and its facets will only respond to messages/events that they subscribed to during initialization.
 *
 *
 * @param {Scope} scope scope to which component will belong. It is usually a top level scope object returned by `milo.binder` or `scope` property of Container facet.
 * @param {Element} element DOM element that component is attached to
 * @param {String} name component name, should be unique in the scope of component
 * @param {ComponentInfo} componentInfo instance of ComponentInfo class that can be used to create a copy of component
 *  TODO try removing it
 * @return {Component}
 */
var Component = _.createSubclass(FacetedObject, 'Component', true);

module.exports = Component;

_registerWithDomStorage('Component');


/**
 * ####Component class methods####
 *
 * - [createComponentClass](#Component$$createComponentClass)
 * - [create](#Component$$create)
 * - [copy](#Component$$copy)
 * - [createOnElement](#Component$$createOnElement)
 * - [isComponent](c_utils.js.html#isComponent)
 * - [getComponent](c_utils.js.html#getComponent)
 * - [getContainingComponent](c_utils.js.html#getContainingComponent)
 * - [createFromState](#Component$$createFromState)
 * - [createFromDataTransfer](#Component$$createFromDataTransfer)
 */
_.extend(Component, {
    createComponentClass: Component$$createComponentClass,
    create: Component$$create,
    copy: Component$$copy,
    createOnElement: Component$$createOnElement,
    isComponent: componentUtils.isComponent,
    getComponent: componentUtils.getComponent,
    getContainingComponent: componentUtils.getContainingComponent,
    createFromState: Component$$createFromState,
    createFromDataTransfer: Component$$createFromDataTransfer
});
delete Component.createFacetedClass;


/**
 * ####Component instance methods####
 *
 * - [init](#Component$init)
 * - [createElement](#Component$createElement)
 * - [hasFacet](#Component$hasFacet)
 * - [addFacet](#Component$addFacet)
 * - [allFacets](#Component$allFacets)
 * - [rename](#Component$rename)
 * - [remove](#Component$remove)
 * - [getState](#Component$getState)
 * - [getTransferState](#Component$getTransferState)
 * - [setState](#Component$setState)
 * - [getScopeParent](#Component$getScopeParent)
 * - [getTopScopeParent](#Component$getTopScopeParent)
 * - [getScopeParentWithClass](#Component$getScopeParentWithClass)
 * - [getTopScopeParentWithClass](#Component$getTopScopeParentWithClass)
 * - [walkScopeTree](#Component$walkScopeTree)
 * - [broadcast](#Component$broadcast)
 * - [destroy](#Component$destroy)
 * - [isDestroyed](#Component$isDestroyed)
 *
 *
 * #####[Messenger](../messenger/index.js.html) methods available on component#####
 *
 * - [on](../messenger/index.js.html#Messenger$on) - single subscribe
 * - [off](../messenger/index.js.html#Messenger$off) - single unsubscribe
 * - [onMessages](../messenger/index.js.html#Messenger$onMessages) - multiple subscribe
 * - [offMessages](../messenger/index.js.html#Messenger$offMessages) - multiple unsubscribe
 * - [postMessage](../messenger/index.js.html#Messenger$postMessage) - post message on component
 * - [getSubscribers](../messenger/index.js.html#Messenger$getSubscribers) - get subscribers for a given message
 */
_.extendProto(Component, {
    init: Component$init,
    start: Component$start,
    createElement: Component$createElement,
    hasFacet: Component$hasFacet,
    addFacet: Component$addFacet,
    allFacets: Component$allFacets,
    rename: Component$rename,
    remove: Component$remove,
    
    getState: Component$getState,
    getTransferState: Component$getTransferState,
    _getState: Component$_getState,
    setState: Component$setState,
    
    getScopeParent: Component$getScopeParent,
    getTopScopeParent: Component$getTopScopeParent,
    getScopeParentWithClass: Component$getScopeParentWithClass,
    getTopScopeParentWithClass: Component$getTopScopeParentWithClass,

    setScopeParentFromDOM: Component$setScopeParentFromDOM,

    walkScopeTree: Component$walkScopeTree,

    treeIndexOf: Component$treeIndexOf, // deprecated
    getComponentAtTreeIndex: Component$getComponentAtTreeIndex, // deprecated
    insertAtTreeIndex: Component$insertAtTreeIndex, // deprecated

    treePathOf: Component$treePathOf,
    getComponentAtTreePath: Component$getComponentAtTreePath,
    insertAtTreePath: Component$insertAtTreePath,

    broadcast: Component$broadcast,
    destroy: Component$destroy,
    isDestroyed: Component$isDestroyed
});

var COMPONENT_DATA_TYPE_PREFIX = 'x-application/milo-component';
var COMPONENT_DATA_TYPE_REGEX = /x-application\/milo-component\/([a-z_$][0-9a-z_$]*)(?:\/())/i;

/**
 * Component class method
 * Creates a subclass of component from the map of configured facets.
 * This method wraps and replaces [`createFacetedClass`](../abstract/faceted_object.js.html#createFacetedClass) class method of FacetedObject.
 * Unlike createFacetedClass, this method take facet classes from registry by their name, so only map of facets configuration needs to be passed. All facets classes should be subclasses of [ComponentFacet](./c_facet.js.html)
 *
 * @param {String} name class name
 * @param {Object[Object] | Array[String]} facetsConfig map of facets configuration.
 *  If some facet does not require configuration, `undefined` should be passed as the configuration for the facet.
 *  If no facet requires configuration, the array of facets names can be passed.
 * @return {Subclass(Component)}
 */
function Component$$createComponentClass(name, facetsConfig) {
    var facetsClasses = {};

    // convert array of facet names to map of empty facets configurations
    if (Array.isArray(facetsConfig)) {
        var configMap = {};
        facetsConfig.forEach(function(fct) {
            var fctName = _.firstLowerCase(fct);
            configMap[fctName] = {};
        });
        facetsConfig = configMap;
    }

    // construct map of facets classes from facetRegistry
    _.eachKey(facetsConfig, function(fctConfig, fct) {
        var fctName = _.firstLowerCase(fct);
        var fctClassName = _.firstUpperCase(fct);
        facetsClasses[fctName] = facetsRegistry.get(fctClassName);
    });

    // create subclass of Component using method of FacetedObject
    var ComponentClass = FacetedObject.createFacetedClass.call(this, name, facetsClasses, facetsConfig);
    
    _registerWithDomStorage(name);

    return ComponentClass;
};


function _registerWithDomStorage(className) {
    DOMStorage.registerDataType(className, Component_domStorageSerializer, Component_domStorageParser);
}


function Component_domStorageSerializer(component) {
    var state = component.getState();
    return JSON.stringify(state);   
}


function Component_domStorageParser(compStr, compClassName) {
    var state = jsonParse(compStr);
    if (state)
        return Component.createFromState(state);
}


/**
 * Component class method
 * Creates component from [ComponentInfo](./c_info.js.html) (used by [milo.binder](../binder.js.html) and to copy component)
 * Component of any registered class (see [componentsRegistry](./c_registry.js.html)) with any additional registered facets (see [facetsRegistry](./c_facets/cf_registry.js.html)) can be created using this method.
 *
 * @param {ComponentInfo} info
 * @param {Boolean} throwOnErrors If set to false, then errors will only be logged to console. True by default.
 @ @return {Component}
 */
function Component$$create(info, throwOnErrors) {
    var ComponentClass = info.ComponentClass;

    if (typeof ComponentClass != 'function') {
        var message = 'create: component class should be function, "' + typeof ComponentClass + '" passed'; 
        if (throwOnErrors === false) {
            logger.error('Component', message, ';using base Component class instead');
            ComponentClass = Component;
        } else
            throw new ComponentError(message);
    }

    var aComponent = new ComponentClass(info.scope, info.el, info.name, info);

    if (info.extraFacetsClasses)
        _.eachKey(info.extraFacetsClasses, function(FacetClass) {
            if (! aComponent.hasFacet(FacetClass))
                aComponent.addFacet(FacetClass, undefined, undefined, throwOnErrors);
        });

    return aComponent;
}


/**
 * Component class method
 * Create a copy of component, including a copy of DOM element. Returns a copy of `component` (of the same class) with new DOM element (not inserted into page).
 * Component is added to the same scope as the original component.
 *
 * @param {Component} component an instance of Component class or subclass
 * @param {Boolean} deepCopy optional `true` to make deep copy of DOM element, otherwise only element without children is copied
 * @return {Component}
 */
function Component$$copy(component, deepCopy) {
    check(component, Component);
    check(deepCopy, Match.Optional(Boolean));

    if (deepCopy && !component.container) 
        throw new ComponentError('Cannot deep copy component without container facet');

    // copy DOM element, using Dom facet if it is available
    var newEl = component.dom 
                    ? component.dom.copy(deepCopy)
                    : component.el.cloneNode(deepCopy);

    var ComponentClass = component.constructor;

    // create component of the same class on the element
    var aComponent = ComponentClass.createOnElement(newEl, undefined, component.scope, component.extraFacets);
    var state = component._getState(deepCopy || false);
    aComponent.setState(state);
    _.deferMethod(aComponent, 'broadcast', 'stateready');
    return aComponent;
}


/**
 * Component class method
 * Creates an instance of component atached to element. All subclasses of component inherit this method.
 * Returns the component of the class this method is used with (thecontext of the method call).
 *
 * @param {Element} el optional element to attach component to. If element is not passed, it will be created
 * @param {String} innerHTML optional inner html to insert in element before binding.
 * @param {Scope} rootScope optional scope to put component in. If not passed, component will be attached to the scope that contains the element. If such scope does not exist, new scope will be created.
 * @param {Array[String]} extraFacets list of extra facet to add to component
 * @return {Subclass(Component)}
 */
function Component$$createOnElement(el, innerHTML, rootScope, extraFacets) {
    check(innerHTML, Match.Optional(String));
    check(rootScope, Match.Optional(Scope));
    check(extraFacets, Match.Optional([String]));

    var Dom = facetsRegistry.get(_.firstUpperCase('dom'));
    var elementPassed = !!el;

    // should required here to resolve circular dependency
    var miloBinder = require('../binder')

    // create element if it wasn't passed
    if (! elementPassed) {
        var domFacetConfig = this.getFacetConfig('dom')
            , templateFacetConfig = this.getFacetConfig('template')
            , template = templateFacetConfig && templateFacetConfig.template;

        var elConfig = {
            domConfig: domFacetConfig,
            template: template,
            content: innerHTML
        };

        el = Dom.createElement(elConfig);
    }

    // find scope to attach component to
    if (! rootScope) {
        var parentComponent = Component.getContainingComponent(el, false, 'Container');
        if (parentComponent)
            rootScope = parentComponent.container.scope;
        else
            rootScope = new Scope(el);
    }

    // add bind attribute to element
    var attr = new BindAttribute(el);
    // "this" refers to the class of component here, as this is a class method
    attr.compClass = this.name;
    attr.compFacets = extraFacets;
    attr.decorate();

    // insert HTML
    if (elementPassed && innerHTML)
        el.innerHTML = innerHTML;

    miloBinder(el, rootScope);
    var aComponent = rootScope[attr.compName];
    aComponent.broadcast('stateready');
    return aComponent;
}


/**
 * Component class method
 * Creates component from component state, that includes information about its class, extra facets, facets data and all scope children.
 * This is used to save/load, copy/paste and drag/drop component
 *
 * @param {Object} state state from which component will be created
 * @param {Scope} rootScope scope to which component will be added
 * @param {Boolean} newUniqueName optional `true` to create component with the name different from the original one. `False` by default.
 * @param {Boolean} throwOnErrors If set to false, then errors will only be logged to console. True by default.
 * @return {Component} component
 */
function Component$$createFromState(state, rootScope, newUniqueName, throwOnErrors) {
    check(state, Match.ObjectIncluding({
        compName: Match.Optional(String),
        compClass: Match.Optional(String),
        extraFacets: Match.Optional([String]),
        facetsStates: Match.Optional(Object),
        outerHTML: String
    }));

    var miloBinder = require('../binder');

    // create wrapper element optionally renaming component
    var wrapEl = _createComponentWrapElement(state, newUniqueName);

    // instantiate all components from HTML
    var scope = miloBinder(wrapEl, undefined, undefined, throwOnErrors);

    // as there should only be one component, call to _any will return it
    var component = scope._any();

    // set component's scope
    if (rootScope) {
        component.scope = rootScope;
        rootScope._add(component);
    }

    // restore component state
    component.setState(state);
    _.deferMethod(component, 'broadcast', 'stateready');

    return component;   
}


// used by Component$$createFromState
function _createComponentWrapElement(state, newUniqueName) {
    var wrapEl = document.createElement('div');
    wrapEl.innerHTML = state.outerHTML;

    var children = domUtils.children(wrapEl);
    if (children.length != 1)
        throw new ComponentError('cannot create component: incorrect HTML, elements number: ' + children.length + ' (should be 1)');
    var compEl = children[0];
    var attr = new BindAttribute(compEl);
    attr.compName = newUniqueName ? miloComponentName() : state.compName;
    attr.compClass = state.compClass;
    attr.compFacets = state.extraFacets;
    attr.decorate();

    return wrapEl;
}

/**
 * Creates a component from a DataTransfer object (if possible)
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer
 * @param {DataTransfer} dataTransfer Data transfer
 */
function Component$$createFromDataTransfer(dataTransfer) {
    var dataType = _.find(dataTransfer.types, function (type) {
        return COMPONENT_DATA_TYPE_REGEX.test(type);
    });
    if (!dataType) return;

    var state = milo.util.jsonParse(dataTransfer.getData(dataType));
    if (!state) return;

    return Component.createFromState(state, undefined, true);
}


/**
 * Component instance method.
 * Initializes component. Automatically called by inherited constructor of FacetedObject.
 * Subclasses should call inherited init methods:
 * ```
 * Component.prototype.init.apply(this, arguments)
 * ```
 *
 * @param {Scope} scope scope to which component will belong. It is usually a top level scope object returned by `milo.binder` or `scope` property of Container facet.
 * @param {Element} element DOM element that component is attached to
 * @param {String} name component name, should be unique in the scope of component
 * @param {ComponentInfo} componentInfo instance of ComponentInfo class that can be used to create a copy of component
 *  TODO try removing it
 */
function Component$init(scope, element, name, componentInfo) {
    // create DOM element if it wasn't passed to Constructor
    this.el = element || this.createElement();

    // store reference to component on DOM element
    if (this.el) {
        // check that element does not have a component already atached
        var elComp = this.el[config.componentRef];
        if (elComp)
            logger.warn('component ' + name + ' attached to element that already has component ' + elComp.name);

        this.el[config.componentRef] = this;
    }

    _.defineProperties(this, {
        componentInfo: componentInfo,
        extraFacets: []
    }, _.ENUM);

    this.name = name;
    this.scope = scope;

    // create component messenger
    var messenger = new Messenger(this, Messenger.defaultMethods, undefined /* no messageSource */);

    _.defineProperty(this, '_messenger', messenger);

    // check all facets dependencies (required facets)
    this.allFacets('check');

    // start all facets
    this.allFacets('start');

    // call start method if it's defined in subclass
    this.start && this.start();
}


/**
 * This is a stub to avoid confusion whether the method of superclass should be called in subclasses
 * The start method of subclass instance is called once all the facets are created, initialized and started (see above)
 */
function Component$start() {}


/**
 * Component instance method.
 * Initializes the element which this component is bound to
 *
 * This method is called when a component is instantiated outside the DOM and
 * will generate a new element for the component.
 * 
 * @return {Element}
 */
function Component$createElement() {
    if (typeof document == 'undefined')
        return;

    this.el = this.dom
                ? this.dom.createElement()
                : document.createElement('DIV');

    return this.el;
}


/**
 * Component instance method
 * Returns true if component has facet
 *
 * @param {Function|String} facetNameOrClass
 * @return {Boolean}
 */
function Component$hasFacet(facetNameOrClass) {
    var facetName = _.firstLowerCase(typeof facetNameOrClass == 'function'
                                        ? facetNameOrClass.name
                                        : facetNameOrClass);

    var facet = this[facetName];
    if (! facet instanceof ComponentFacet)
        logger.warn('expected facet', facetName, 'but this property name is used for something else');

    return !! facet;
}


/**
 * Component instance method.
 * Adds facet with given name or class to the instance of Component (or its subclass).
 * 
 * @param {String|Subclass(Component)} facetNameOrClass name of facet class or the class itself. If name is passed, the class will be retireved from facetsRegistry
 * @param {Object} facetConfig optional facet configuration
 * @param {String} facetName optional facet name. Allows to add facet under a name different from the class name supplied.
 * @param {Boolean} throwOnErrors If set to false, then errors will only be logged to console. True by default.
 */
function Component$addFacet(facetNameOrClass, facetConfig, facetName, throwOnErrors) {
    check(facetNameOrClass, Match.OneOf(String, Match.Subclass(ComponentFacet)));
    check(facetConfig, Match.Optional(Object));
    check(facetName, Match.Optional(String));

    var FacetClass;
    // if only name passed, retrieve facet class from registry
    if (typeof facetNameOrClass == 'string') {
        var facetClassName = _.firstUpperCase(facetNameOrClass);
        FacetClass = facetsRegistry.get(facetClassName);
    } else 
        FacetClass = facetNameOrClass;

    if (!facetName)
        facetName = _.firstLowerCase(FacetClass.name)

    this.extraFacets.push(facetName);

    // add facet using method of FacetedObject
    var newFacet = FacetedObject.prototype.addFacet.call(this, FacetClass, facetConfig, facetName, throwOnErrors);

    // check depenedencies and start facet
    newFacet.check && newFacet.check();
    newFacet.start && newFacet.start();
}


/**
 * Component instance method.
 * Envoke given method with optional parameters on all facets.
 * Returns the map of values returned by all facets. If the facet doesn't have the method it is simply not called and the value in the map will be undefined.
 *
 * @param {String} method method name to envoke on the facet
 * @return {Object}
 */
function Component$allFacets(method) { // ,... arguments
    var args = _.slice(arguments, 1);

    return _.mapKeys(this.facets, function(facet, fctName) {
        if (facet && typeof facet[method] == 'function')
            return facet[method].apply(facet, args);
    });
}


/**
 * Component instance method.
 * 
 * @param {[String]} name optional new name of component, 
 * @param {[Boolean]} renameInScope optional false to not rename ComponentInfo object in its scope, true by default
 */
function Component$rename(name, renameInScope) {
    name = name || miloComponentName();
    this.componentInfo.rename(name, false);
    if (this.scope && renameInScope !== false) {
        this.scope._remove(this.name);
        this.scope._add(this, name);
    } else
        this.name = name;
}


/**
 * Component instance method.
 * Removes component from its scope.
 *
 * @param {Boolean} preserveScopeProperty true not to delete scope property of component
 */
function Component$remove(preserveScopeProperty) {
    if (this.scope) {
        this.scope._remove(this.name);
        if (! preserveScopeProperty)
            delete this.scope;
    }
}


/**
 * Component instance method
 * Retrieves all component state, including information about its class, extra facets, facets data and all scope children.
 * This information is used to save/load, copy/paste and drag/drop component 
 * Returns component state
 *
 * @this {Component} component which state will be saved
 * @return {Object}
 */
function Component$getState() {
    this.broadcast('getstatestarted', { rootComponent: this }, undefined, true);
    var state = this._getState(true);
    state.outerHTML = this.el.outerHTML;
    _.deferMethod(this, 'broadcast', 'getstatecompleted', { rootComponent: this }, undefined, true);
    return state;
}


/**
 * Component instance method
 * Retrieves all component state, including information about its class, extra facets, facets data and all scope children.
 * This information is used to save/load, copy/paste and drag/drop component 
 * If component has [Transfer](./c_facets/Transfer.js.html) facet on it, this method retrieves state from this facet
 * Returns component state
 *
 * @this {Component} component which state will be saved
 * @return {Object}
 */
function Component$getTransferState() {
    return this.transfer
            ? this.transfer.getState()
            : this.getState();
}


/**
 * Component instance method
 * Returns the state of component
 * Used by class method `Component.getState` and by [Container](./c_facets/Container.js.html) facet.
 *
 * @private
 * @param {Boolean} deepState false to get shallow state from all facets (true by default)
 * @return {Object}
 */
function Component$_getState(deepState){

    var facetsStates = this.allFacets('getState', deepState === false ? false : true);
    facetsStates = _.filterKeys(facetsStates, function(fctState) {
        return !! fctState;
    });

    return {
        compName: this.name,
        compClass: this.constructor.name,
        extraFacets: this.extraFacets,
        facetsStates: facetsStates
    };
}


/**
 * Component instance method
 * Sets the state of component.
 * Used by class method `Component.createFromState` and by [Container](./c_facets/Container.js.html) facet.
 *
 * @private
 * @param {Object} state state to set the component
 */
function Component$setState(state) {
    if (state.facetsStates)
        _.eachKey(state.facetsStates, function(fctState, fctName) {
            var facet = this[fctName];
            if (facet && typeof facet.setState == 'function')
                facet.setState(fctState);
        }, this);
}


/**
 * Component instance method.
 * Returns the scope parent of a component.
 * If `conditionOrFacet` parameter is not specified, an immediate parent will be returned, otherwise the closest ancestor with a specified facet or passing condition test.
 *
 * @param {Function|String} conditionOrFacet optional condition that component should pass (or facet name it should contain)
 * @return {Component|undefined}
 */
function Component$getScopeParent(conditionOrFacet) {
    check(conditionOrFacet, Match.Optional(Match.OneOf(Function, String)));
    var conditionFunc = _makeComponentConditionFunc(conditionOrFacet);
    return _getScopeParent.call(this, conditionFunc);   
}

function _getScopeParent(conditionFunc) {
    try { var parent = this.scope._hostObject.owner; } catch(e) {}

    // Where there is no parent, this function will return undefined
    // The parent component is checked recursively
    if (parent) {
        if (! conditionFunc || conditionFunc(parent) )
            return parent;
        else
            return _getScopeParent.call(parent, conditionFunc);
    }
}


/**
 * Component instance method
 * Returns scope parent with a given class, with same class if not specified
 *
 * @param {[Function]} ComponentClass component class that the parent should have, same class by default
 * @return {Component}
 */
function Component$getScopeParentWithClass(ComponentClass) {
    ComponentClass = ComponentClass || this.constructor;
    return _getScopeParent.call(this, function(comp) {
        return comp instanceof ComponentClass;
    })
}


/**
 * Component instance method.
 * Returns the topmost scope parent of a component.
 * If `conditionOrFacet` parameter is not specified, the topmost scope parent will be returned, otherwise the topmost ancestor with a specified facet or passing condition test.
 *
 * @param {Function|String} conditionOrFacet optional condition that component should pass (or facet name it should contain)
 * @return {Component|undefined}
 */
function Component$getTopScopeParent(conditionOrFacet) {
    check(conditionOrFacet, Match.Optional(Match.OneOf(Function, String)));
    var conditionFunc = _makeComponentConditionFunc(conditionOrFacet);
    return _getTopScopeParent.call(this, conditionFunc);    
}

function _getTopScopeParent(conditionFunc) {
    var topParent
        , parent = this;
    do {
        parent = _getScopeParent.call(parent, conditionFunc);
        if (parent)
            topParent = parent;
    } while (parent);

    return topParent;
}


/**
 * Component instance method
 * Returns scope parent with a given class, with same class if not specified
 *
 * @param {[Function]} ComponentClass component class that the parent should have, same class by default
 * @return {Component}
 */
function Component$getTopScopeParentWithClass(ComponentClass) {
    ComponentClass = ComponentClass || this.constructor;
    return _getTopScopeParent.call(this, function(comp) {
        return comp instanceof ComponentClass;
    })
}


/**
 * Component instance method
 * Finds scope parent of component using DOM tree (unlike getScopeParent that simply goes up the scope tree).
 * While getScopeParent is faster it may fail if scope chain is not setup yet (e.g., when component has been just inserted).
 * The scope property of component will be changed to point to scope object of container facet of that parent.
 * Returned scope parent of the component will be undefined (as well as component's scope property) if no parent in the DOM tree has container facet.
 *
 * @return {Component}
 */
function Component$setScopeParentFromDOM() {
    var parentEl = this.el.parentNode;

    while (parentEl && ! foundParent) {
        var parent = Component.getComponent(parentEl);
        var foundParent = parent && parent.container;
        parentEl = parentEl.parentNode;
    }

    this.remove(); // remove component from its current scope (if it is defined)
    if (foundParent) {
        this.rename(undefined, false);
        parent.container.scope._add(this);
        return parent;
    }        
}


/**
 * Walks component tree, calling provided callback on each component
 *
 * @param callback
 * @param thisArg
 */
function Component$walkScopeTree(callback, thisArg) {
    callback.call(thisArg, this);
    if (!this.container) return;
    this.container.scope._each(function(component) {
        component.walkScopeTree(callback, thisArg);
    });
}


/**
 * Returns sequential index of component's element inside this component's DOM tree as traversed by TreeWalker.
 * Returns -1 if passed component is not contained, 0 if component itself is passed.
 * 
 * @param {Component} component
 */
function Component$treeIndexOf(component) {
    return domUtils.treeIndexOf(this.el, component.el);
}


function Component$getComponentAtTreeIndex(treeIndex) {
    var node = domUtils.getNodeAtTreeIndex(this.el, treeIndex);
    return Component.getComponent(node);
}


function Component$insertAtTreeIndex(treeIndex, component) {
    var wasInserted = domUtils.insertAtTreeIndex(this.el, treeIndex, component.el);
    if (wasInserted) component.setScopeParentFromDOM();
    return wasInserted;
}


function Component$treePathOf(component) {
    return domUtils.treePathOf(this.el, component.el);
}


function Component$getComponentAtTreePath(treePath, nearest) {
    var node = domUtils.getNodeAtTreePath(this.el, treePath, nearest);
    return Component.getComponent(node);
}


function Component$insertAtTreePath(treePath, component, nearest) {
    var wasInserted = domUtils.insertAtTreePath(this.el, treePath, component.el);
    if (wasInserted) component.setScopeParentFromDOM();
    return wasInserted;
}




/**
 * Broadcast message to component and to all its scope children
 *
 * @param {String|RegExp} msg message to be sent
 * @param {[Any]} data optional message data
 * @param {[Function]} callback optional callback
 * @param {[Boolean]} synchronously if it should use postMessageSync
 */
function Component$broadcast(msg, data, callback, synchronously) {
    var postMethod = synchronously ? 'postMessageSync' : 'postMessage';
    this.walkScopeTree(function(component) {
        component[postMethod](msg, data, callback)
    });
}


/**
 * Destroy component: removes component from DOM, removes it from scope, deletes all references to DOM nodes and unsubscribes from all messages both component and all facets
 */
function Component$destroy(quiet) {
    if (this._destroyed) {
        if (!quiet) logger.warn('Component destroy: component is already destroyed');
        return;
    }
    this.remove();
    this.allFacets('destroy');
    if (! this.el) return;
    domUtils.detachComponent(this.el);
    domUtils.removeElement(this.el);
    delete this.el;
    this.componentInfo.destroy();
    this._destroyed = true;
}


/**
 * Returns true if component was destroyed
 *
 * @return {Boolean}
 */
function Component$isDestroyed() {
    return this._destroyed;
}

},{"../abstract/faceted_object":2,"../attributes/a_bind":5,"../binder":9,"../config":64,"../messenger":69,"../util/check":88,"../util/component_name":89,"../util/dom":91,"../util/error":94,"../util/json_parse":97,"../util/logger":98,"../util/storage":103,"./c_facets/cf_registry":31,"./c_utils":34,"./scope":41,"mol-proto":109}],17:[function(require,module,exports){
'use strict';

/**
 * `milo.Component.Facet`
 *
 * The class fot the facet of component. When a component is created, it
 * creates all its facets.
 *
 * See Facets section on information about available facets and on
 * how to create new facets classes.
 *
 * - Component - basic compponent class
 * - ComponentFacet - basic
 */

var Facet = require('../abstract/facet')
    , Messenger = require('../messenger')
    , FacetError = require('../util/error').Facet
    , componentUtils = require('./c_utils')
    , _ = require('mol-proto');

var ComponentFacet = _.createSubclass(Facet, 'ComponentFacet');

module.exports = ComponentFacet;


/**
 * postDomParent
 *
 * If facet has DOM parent facet (see `domParent` method), posts the message to this facet.
 *
 * @param {String} messageType
 * @param {Object} messageData
 */
var postDomParent = _.partial(_postParent, domParent);

/**
 * postScopeParent
 *
 * If facet has scope parent facet (see `scopeParent` method), posts the message to this facet.
 *
 * @param {String} messageType
 * @param {Object} messageData
 */
var postScopeParent = _.partial(_postParent, scopeParent);


_.extendProto(ComponentFacet, {
    init: ComponentFacet$init,
    start: ComponentFacet$start,
    check: ComponentFacet$check,
    destroy: ComponentFacet$destroy,
    onConfigMessages: ComponentFacet$onConfigMessages,
    domParent: domParent,
    postDomParent: postDomParent,
    scopeParent: scopeParent,
    postScopeParent: postScopeParent,
    getMessageSource: getMessageSource,
    dispatchSourceMessage: dispatchSourceMessage,
    _createMessenger: _createMessenger,
    _setMessageSource: _setMessageSource,
    _createMessageSource: _createMessageSource,
    _createMessageSourceWithAPI: _createMessageSourceWithAPI
});

_.extend(ComponentFacet, {
    requiresFacet: requiresFacet
});


// initComponentFacet
function ComponentFacet$init() {
    this._createMessenger();
}


// some classes (e.g. ModelFacet) overrride this method and do not create their own messenger
function _createMessenger(){
    var messenger = new Messenger(this, Messenger.defaultMethods, undefined /* no messageSource */);

    _.defineProperties(this, {
        _messenger: messenger
    });
}


// startComponentFacet
function ComponentFacet$start() {
    if (this.config.messages)
        this.onConfigMessages(this.config.messages);
}


function ComponentFacet$onConfigMessages(messageSubscribers) {
    var notYetRegisteredMap = _.mapKeys(messageSubscribers, function(subscriber, messages) {
        var subscriberType = typeof subscriber;
        if (subscriberType == 'function')
            return this.on(messages, subscriber);

        if (subscriberType == 'object') {
            var contextType = typeof subscriber.context;
            if (contextType == 'object')
                return this.on(messages, subscriber);

            if (contextType == 'string') {
                if (subscriber.context == this.name || subscriber.context == 'facet')
                    subscriber = {
                        subscriber: subscriber.subscriber,
                        context: this
                    };
                else if (subscriber.context == 'owner')
                    subscriber = {
                        subscriber: subscriber.subscriber,
                        context: this.owner
                    };
                else
                    throw new FacetError('unknown subscriber context in configuration: ' + subscriber.context);

                return this.on(messages, subscriber);
            }

            throw new FacetError('unknown subscriber context type in configuration: ' + contextType);
        }

        throw new FacetError('unknown subscriber type in configuration: ' + subscriberType);
    }, this);

    return notYetRegisteredMap;
}


// checkDependencies
function ComponentFacet$check() {
    if (this.require) {
        this.require.forEach(function(reqFacet) {
            if (! this.owner.hasFacet(reqFacet))
                this.owner.addFacet(reqFacet);
        }, this);
    }
}


// destroys facet
function ComponentFacet$destroy() {
    if(this._messenger)
        this._messenger.destroy();
}


/**
 * domParent
 *
 * @return {ComponentFacet} reference to the facet of the same class of the closest parent DOM element, that has a component with the same facet class attached to it. If such element doesn't exist method will return undefined.
 */
function domParent() {
    var parentComponent = componentUtils.getContainingComponent(this.owner.el, false, this.name);
    return parentComponent && parentComponent[this.name];
}


/**
 * scopeParent
 *
 * @return {ComponentFacet} reference to the facet of the same class as `this` facet of the closest scope parent (i.e., the component that has the scope of the current component in its container facet).
 */
function scopeParent() {
    var parentComponent = this.owner.getScopeParent(this.name);
    return parentComponent && parentComponent[this.name];
}


function _postParent(getParentMethod, messageType, messageData) {
    var parentFacet = getParentMethod.call(this);
    if (parentFacet)
        parentFacet.postMessage(messageType, messageData);
}


function _setMessageSource(messageSource) {
    this._messenger._setMessageSource(messageSource);
}


function getMessageSource() {
    return this._messenger.getMessageSource();
}


function dispatchSourceMessage(message, data) {
    return this.getMessageSource().dispatchMessage(message, data);
}


function _createMessageSource(MessageSourceClass, options) {
    var messageSource = new MessageSourceClass(this, undefined, this.owner, options);
    this._setMessageSource(messageSource)

    _.defineProperty(this, '_messageSource', messageSource);
}


function _createMessageSourceWithAPI(MessageSourceClass, messengerAPIOrClass, options) {
    var messageSource = new MessageSourceClass(this, undefined, messengerAPIOrClass, this.owner, options);
    this._setMessageSource(messageSource)

    _.defineProperty(this, '_messageSource', messageSource);
}


function requiresFacet(facetName) {
    // 'this' refers to the Facet Class
    var facetRequire = this.prototype.require;

    return facetRequire && (facetRequire.indexOf(_.firstUpperCase(facetName)) >= 0
                        || facetRequire.indexOf(_.firstLowerCase(facetName)) >= 0);
}

},{"../abstract/facet":1,"../messenger":69,"../util/error":94,"./c_utils":34,"mol-proto":109}],18:[function(require,module,exports){
'use strict';


var ComponentFacet = require('../c_facet')
    , miloBinder = require('../../binder')
    , Scope = require('../scope')
    , _ = require('mol-proto')
    , facetsRegistry = require('./cf_registry')
    , domUtils = require('../../util/dom')
    , logger = require('../../util/logger');


/**
 * `milo.registry.facets.get('Container')`
 * A special component facet that makes component create its own inner scope.
 * When [milo.binder](../../binder.js.html) binds DOM tree and creates components, if components are inside component WITH Container facet, they are put on the `scope` of it (component.container.scope - see [Scope](../scope.js.html)), otherwise they are put on the same scope even though they may be deeper in DOM tree.
 * It allows creating namespaces avoiding components names conflicts, at the same time creating more shallow components tree than the DOM tree.
 * To create components for elements inside the current component use:
 * ```
 * component.container.binder();
 * ```
 * See [milo.binder](../../binder.js.html)
 */
var Container = _.createSubclass(ComponentFacet, 'Container');


/**
 * ####Container facet instance methods####
 *
 * - [binder](#Container$binder) - create components from DOM inside the current one
 */
_.extendProto(Container, {
    start: Container$start,
    getState: Container$getState,
    setState: Container$setState,
    binder: Container$binder,
    destroy: Container$destroy,
    unwrap: Container$unwrap
});

facetsRegistry.add(Container);

module.exports = Container;


/**
 * Component instance method.
 * Scans DOM, creates components and adds to scope children of component element.
 */
function Container$binder() {
    return miloBinder(this.owner.el, this.scope, false);
}


/**
 * Component instance method.
 * Setup empty scope object on start
 */
function Container$start() {
    ComponentFacet.prototype.start.apply(this, arguments);
    this.scope = new Scope(this.owner.el, this);
}


/**
 * Container instance method
 * Called by `Component.prototype.getState` to get facet's state
 * Returns the state of components in the scope
 *
 * @param {Boolean} deepCopy true by default
 * @return {Object}
 */
function Container$getState(deepCopy) {
    var state = { scope: {} };
    if (deepCopy !== false)
        this.scope._each(function(component, compName) {
            state.scope[compName] = component._getState();
        });
    return state;
}


/**
 * Container instance method
 * Called by `Component.prototype.setState` to set facet's state
 * Sets the state of components in the scope
 *
 * @param {Object} data data to set on facet's model
 */
function Container$setState(state) {
    _.eachKey(state.scope, function(compData, compName) {
        var component = this.scope[compName];
        if (component)
            component.setState(compData);
        else
            logger.warn('component "' + compName + '" does not exist on scope');
    }, this);
}

function Container$destroy() {
    this.scope._each(function(component) {
        component.destroy();
    });
    this.scope._detachElement();
    ComponentFacet.prototype.destroy.apply(this, arguments);
}


/**
 * Container instance method
 * Moves all of the contents of the owner into the parent scope
 * 
 * @param {Boolean} renameChildren pass false to not rename scope children (default is true)
 * @param {Boolean} destroy If not false, the component will be destroyed at the end (default is true).
 */
function Container$unwrap(renameChildren, destroy) {
    domUtils.unwrapElement(this.owner.el);
    this.scope && this.scope._each(function (child) {
        child.remove();
        if (renameChildren !== false) child.rename(undefined, false);
        this.owner.scope && this.owner.scope._add(child);
    }, this);
    if (destroy !== false) this.owner.destroy();
}

},{"../../binder":9,"../../util/dom":91,"../../util/logger":98,"../c_facet":17,"../scope":41,"./cf_registry":31,"mol-proto":109}],19:[function(require,module,exports){
'use strict';

var Mixin = require('../../abstract/mixin')
    , ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')

    , Messenger = require('../../messenger')
    , DOMEventsSource = require('../msg_src/dom_events')
    , DataMsgAPI = require('../msg_api/data')
    , getElementDataAccess = require('../msg_api/de_data')
    , pathUtils = require('../../model/path_utils')
    , ModelPath = require('../../model/m_path')
    , modelUtils = require('../../model/model_utils')
    , changeDataHandler = require('../../model/change_data')
    , getTransactionFlag = changeDataHandler.getTransactionFlag
    , setTransactionFlag = changeDataHandler.setTransactionFlag
    , postTransactionFinished = changeDataHandler.postTransactionFinished

    , _ = require('mol-proto')
    , logger = require('../../util/logger');


/**
 * `milo.registry.facets.get('Data')`
 * Facet to give access to DOM data
 */
var Data = _.createSubclass(ComponentFacet, 'Data');


/**
 * Data facet instance methods
 *
 * - [start](#Data$start) - start Data facet
 * - [get](#Data$get) - get DOM data from DOM tree
 * - [set](#Data$set) - set DOM data to DOM tree
 * - [path](#Data$path) - get reference to Data facet by path
 */
_.extendProto(Data, {
    start: Data$start,
    getState: Data$getState,
    setState: Data$setState,

    get: Data$get,
    set: Data$set,
    del: Data$del,
    splice: Data$splice,
    path: Data$path,
    getPath: Data$getPath,
    getKey: Data$getKey,

    _get: Data$_get,
    _set: Data$_set,
    _del: Data$_del,
    _splice: Data$_splice,

    _setScalarValue: Data$_setScalarValue,
    _getScalarValue: Data$_getScalarValue,
    _bubbleUpDataChange: Data$_bubbleUpDataChange,
    _queueDataChange: Data$_queueDataChange,
    _postDataChanges: Data$_postDataChanges,
    _prepareMessageSource: _prepareMessageSource
});

facetsRegistry.add(Data);

module.exports = Data;


/**
 * ModelPath methods added to Data prototype
 */
['len', 'push', 'pop', 'unshift', 'shift'].forEach(function(methodName) {
    var method = ModelPath.prototype[methodName];
    _.defineProperty(Data.prototype, methodName, method);
});



// these methods will be wrapped to support "*" pattern subscriptions
var proxyDataSourceMethods = {
        // value: 'value',
        trigger: 'trigger'
    };


/**
 * Data facet instance method
 * Starts Data facet
 * Called by component after component is initialized.
 */
function Data$start() {
    // change messenger methods to work with "*" subscriptions (like Model class)
    pathUtils.wrapMessengerMethods.call(this);

    ComponentFacet.prototype.start.apply(this, arguments);

    // get/set methods to set data of element
    this.elData = getElementDataAccess(this.owner.el);

    this._dataChangesQueue = [];

    this._prepareMessageSource();

    // store facet data path
    this._path = '.' + this.owner.name;

    // current value
    this._value = this.get();

    // prepare internal and external messengers
    // this._prepareMessengers();

    // subscribe to DOM event and accessors' messages
    this.onSync('', onOwnDataChange);

    // message to mark the end of batch on the current level
    this.onSync('datachangesfinished', onDataChangesFinished);

    // changes in scope children with Data facet
    this.onSync('childdata', onChildData);

    // to enable reactive connections
    this.onSync('changedata', changeDataHandler);
}


/**
 * Data facet instance method
 * Create and connect internal and external messengers of Data facet.
 * External messenger's methods are proxied on the Data facet and they allows "*" subscriptions.
 */
function _prepareMessengers() {
    // Data facet will post all its changes on internal messenger
    var internalMessenger = new Messenger(this);

    // message source to connect internal messenger to external
    var internalMessengerSource = new MessengerMessageSource(this, undefined, new ModelMsgAPI, internalMessenger);

    // external messenger to which all model users will subscribe,
    // that will allow "*" subscriptions and support "changedata" message api.
    var externalMessenger = new Messenger(this, Messenger.defaultMethods, internalMessengerSource);

    _.defineProperties(this, {
        _messenger: externalMessenger,
        _internalMessenger: internalMessenger
    });
}


/**
 * Data facet instance method
 * Initializes DOMEventsSource and connects it to Data facet messenger
 *
 * @private
 */
function _prepareMessageSource() {
    var dataAPI = new DataMsgAPI(this.owner)
        , dataEventsSource = new DOMEventsSource(this, proxyDataSourceMethods, dataAPI, this.owner);
    this._setMessageSource(dataEventsSource);

    _.defineProperty(this, '_dataEventsSource', dataEventsSource);

    // make value method of DataMsgAPI available on Data facet
    // this is a private method, get() should be used to get data.
    Mixin.prototype._createProxyMethod.call(dataAPI, 'value', 'value', this);
}


/**
 * Subscriber to data change event
 *
 * @private
 * @param {String} msgType in this instance will be ''
 * @param {Object} data data change information
 */
function onOwnDataChange(msgType, data) {
    this._bubbleUpDataChange(data);
    this._queueDataChange(data);
    if (data.path === '') {
        var inTransaction = getTransactionFlag(data);
        this.postMessage('datachangesfinished', { transaction: inTransaction });
    }
}


/**
 * Data facet instance method
 * Sends data `message` to DOM parent
 *
 * @private
 * @param {Object} msgData data change message
 */
function Data$_bubbleUpDataChange(msgData) {
    var parentData = this.scopeParent();

    if (parentData) {
        var parentMsg = _.clone(msgData);
        parentMsg.path = (this._path || ('.' + thisComp.name))  + parentMsg.path;
        parentData.postMessage('childdata', parentMsg || msgData);
    }
}


/**
 * Data facet instance method
 * Queues data messages to be dispatched to connector
 *
 * @private
 * @param {Object} change data change description
 */
function Data$_queueDataChange(change) {
    this._dataChangesQueue.push(change);
}


/**
 * Subscriber to datachangesfinished event.
 * Calls the method to post changes batch and bubbles up the message
 *
 * @param  {[type]} msg  [description]
 * @param  {[type]} data [description]
 */
function onDataChangesFinished(msg, data) {
    this._postDataChanges(data.inTransaction);
    var parentData = this.scopeParent();
    if (parentData) parentData.postMessage('datachangesfinished', data);
}


/**
 * Dispatches all changes collected in the batch
 * Used for data propagation - connector subscribes to this message
 *
 * @private
 */
function Data$_postDataChanges(inTransaction) {
    var queue = this._dataChangesQueue.reverse();
    this.postMessageSync('datachanges', {
        changes: queue,
        transaction: inTransaction
    });
    this._dataChangesQueue = []; // it can't be .length = 0, as the actual array may still be used
}


/**
 * Subscriber to data change event in child Data facet
 *
 * @private
 * @param {String} msgType
 * @param {Obejct} data data change information
 */
function onChildData(msgType, data) {
    this.postMessage(data.path, data);
    this._bubbleUpDataChange(data);
    this._queueDataChange(data);
}


/**
 * Data facet instance method
 * Sets data in DOM hierarchy recursively.
 * Returns the object with the data actually set (can be different, if components matching some properties are missing).
 *
 * @param {Object|String|Number} value value to be set. If the value if scalar, it will be set on component's element, if the value is object - on DOM tree inside component
 * @return {Object|String|Number}
 */
function Data$set(value) {
    var inTransaction = getTransactionFlag(Data$set);

    var componentSetter = this.config.set;
    if (typeof componentSetter == 'function') {
        var result = componentSetter.call(this.owner, value);
        return result;
    }

    setTransactionFlag(this._set, inTransaction);

    var oldValue = this._value
        , newValue = this._set(value);

    // this message triggers onOwnDataChange, as well as actuall DOM change
    // so the parent gets notified
    var msg = { path: '', type: 'changed',
                newValue: newValue, oldValue: oldValue };
    setTransactionFlag(msg, inTransaction);
    this.postMessage('', msg);

    return newValue;
}


function Data$_set(value) {
    var inTransaction = getTransactionFlag(Data$_set);

    var valueSet;
    if (value != null && typeof value == 'object') {
        if (Array.isArray(value)) {
            valueSet = [];

            var listFacet = this.owner.list;
            if (listFacet){
                var listLength = listFacet.count()
                    , newItemsCount = value.length - listLength;
                if (newItemsCount >= 3) {
                    listFacet.addItems(newItemsCount);
                    _updataDataPaths(listFacet, listLength, listFacet.count());
                }

                value.forEach(function(childValue, index) {
                    setChildData.call(this, valueSet, childValue, index, '[$$]');
                }, this);

                var listCount = listFacet.count()
                    , removeCount = listCount - value.length;

                while (removeCount-- > 0)
                    listFacet.removeItem(value.length);
            } else
                logger.warn('Data: setting array data without List facet');
        } else {
            valueSet = {};
            _.eachKey(value, function(childValue, key) {
                setChildData.call(this, valueSet, childValue, key, '.$$');
            }, this);
        }
    } else
        valueSet = this._setScalarValue(value);

    this._value = valueSet;

    return valueSet;


    function setChildData(valueSet, childValue, key, pathSyntax) {
        var childPath = pathSyntax.replace('$$', key);
        var childDataFacet = this.path(childPath, typeof childValue != 'undefined');
        if (childDataFacet) {
            setTransactionFlag(childDataFacet.set, inTransaction);
            valueSet[key] = childDataFacet.set(childValue);
        }
    }
}


/**
 * Data facet instance method
 * Deletes component from view and scope, only in case it has Item facet on it
 *
 * @param {String|Number} value value to set to DOM element
 */
function Data$del() {
    var inTransaction = getTransactionFlag(Data$del);

    var componentDelete = this.config.del;
    if (typeof componentDelete == 'function') {
        var result = componentDelete.call(this.owner);
        postTransactionFinished.call(this, inTransaction);
        return result;
    }

    var oldValue = this._value

    setTransactionFlag(this._del, inTransaction);
    this._del();

    // this message triggers onOwnDataChange, as well as actuall DOM change
    // so the parent gets notified
    var msg = { path: '', type: 'deleted', oldValue: oldValue };
    setTransactionFlag(msg, inTransaction);
    this.postMessage('', msg);
}


function Data$_del() {
    var inTransaction = getTransactionFlag(Data$_del);
    setTransactionFlag(this._set, inTransaction);
    this._set();
}


/**
 * Data facet instance method
 * Sets scalar value to DOM element
 *
 * @private
 * @param {String|Number} value value to set to DOM element
 */
function Data$_setScalarValue(value) {
    return this.elData.set(this.owner.el, value);
}


/**
 * Data facet instance method
 * Get structured data from DOM hierarchy recursively
 * Returns DOM data
 *
 * @param {Boolean} deepGet true by default
 * @return {Object}
 */
function Data$get(deepGet) {
    var componentGetter = this.config.get;
    if (typeof componentGetter == 'function')
        return componentGetter.call(this.owner, deepGet);

    return this._get(deepGet);
}

function Data$_get(deepGet) {
    if (deepGet === false) // a hack to enable getting shallow state
        return;

    var comp = this.owner
        , scopeData;

    if (comp.list) {
        scopeData = [];
        comp.list.each(function(listItem, index) {
            scopeData[index] = listItem.data.get();
        });

        if (comp.container)
            comp.container.scope._each(function(scopeItem, name) {
                if (! comp.list.contains(scopeItem) && scopeItem.data)
                    scopeData[name] = scopeItem.data.get();
            });
    } else if (comp.container) {
        scopeData = {};
        comp.container.scope._each(function(scopeItem, name) {
            if (scopeItem.data)
                scopeData[name] = scopeItem.data.get();
        });
    } else
        scopeData = this._getScalarValue();

    this._value = scopeData;

    return scopeData;
}


/**
 * Data facet instance method
 * Gets scalar data from DOM element
 *
 * @private
 */
function Data$_getScalarValue() {
    return this.elData.get(this.owner.el);
}


/**
 * Data facet instance method
 * Splices List items. Requires List facet to be present on component. Works in the same way as array splice.
 * Returns data retrieved from removed items
 *
 * @param {Integer} spliceIndex index to delete/insert at
 * @param {Integer} spliceHowMany number of items to delete
 * @param {List} arguments optional items to insert
 * @return {Array}
 */
function Data$splice(spliceIndex, spliceHowMany) { //, ... arguments
    var inTransaction = getTransactionFlag(Data$splice);

    var componentSplice = this.config.splice;
    if (typeof componentSplice == 'function') {
        var result = componentSplice.apply(this.owner, arguments);
        postTransactionFinished.call(this, inTransaction);
        return result;
    }

    setTransactionFlag(this._splice, inTransaction);
    var result = this._splice.apply(this, arguments);

    if (!result) return;

    var msg = { path: '', type: 'splice',
                index: result.spliceIndex,
                removed: result.removed,
                addedCount: result.addedCount,
                newValue: this._value };
    setTransactionFlag(msg, inTransaction);
    this.postMessage('', msg);

    return result.removed;
}


function Data$_splice(spliceIndex, spliceHowMany) { //, ... arguments
    var inTransaction = getTransactionFlag(Data$_splice);

    var listFacet = this.owner.list;
    if (! listFacet)
        return logger.warn('Data: cannot use splice method without List facet');

    var removed = [];

    var listLength = listFacet.count();
    arguments[0] = spliceIndex =
        modelUtils.normalizeSpliceIndex(spliceIndex, listLength);

    if (spliceHowMany > 0 && listLength > 0) {
        for (var i = spliceIndex; i < spliceIndex + spliceHowMany; i++) {
            var item = listFacet.item(spliceIndex);
            if (item) {
                var itemData = item.data.get();
                listFacet.removeItem(spliceIndex);
            } else
                logger.warn('Data: no item for index', i);

            removed.push(itemData);
        }

        _updataDataPaths(listFacet, spliceIndex, listFacet.count());
    }

    var added = [];

    var argsLen = arguments.length
        , addItems = argsLen > 2
        , addedCount = argsLen - 2;
    if (addItems) {
        listFacet.addItems(addedCount, spliceIndex);
        for (var i = 2, j = spliceIndex; i < argsLen; i++, j++) {
            var item = listFacet.item(j);
            if (item) {
                setTransactionFlag(item.data.set, inTransaction);
                var itemData = item.data.set(arguments[i]);
            } else
                logger.warn('Data: no item for index', j);

            added.push(itemData);
        }

        // change paths of items that were added and items after them
        _updataDataPaths(listFacet, spliceIndex, listFacet.count());
    }

    // if (Array.isArray(this._value)) {
    //     _.prependArray(added, [spliceIndex, spliceHowMany]);
    //     Array.prototype.splice.apply(this._value, added);
    // } else
        this._value = this.get();

    return {
        spliceIndex: spliceIndex,
        removed: removed,
        addedCount: addItems ? addedCount : 0
    };
}


// toIndex is not included
// no range checking is made
function _updataDataPaths(listFacet, fromIndex, toIndex) {
    for (var i = fromIndex; i < toIndex; i++) {
        var item = listFacet.item(i);
        if (item)
            item.data._path = '[' + i + ']';
        else
            logger.warn('Data: no item for index', j);
    }
}


/**
 * Data facet instance method
 * Returns data facet of a child component (by scopes) corresponding to the path
 * @param {String} accessPath data access path
 */
function Data$path(accessPath, createItem) {
    // createItem = true; // this hack seems to be no longer needed...

    if (! accessPath)
        return this;

    var parsedPath = pathUtils.parseAccessPath(accessPath);
    var currentComponent = this.owner;

    for (var i = 0, len = parsedPath.length; i < len; i++) {
        var pathNode = parsedPath[i]
            , nodeKey = pathUtils.getPathNodeKey(pathNode);
        if (pathNode.syntax == 'array' && currentComponent.list) {
            var itemComponent = currentComponent.list.item(nodeKey);
            if (! itemComponent && createItem !== false) {
                itemComponent = currentComponent.list.addItem(nodeKey);
                itemComponent.data._path = pathNode.property;
            }
            currentComponent = itemComponent;
        } else if (currentComponent.container)
            currentComponent = currentComponent.container.scope[nodeKey];

        var currentDataFacet = currentComponent && currentComponent.data;
        if (! currentDataFacet)
            break;
    }

    return currentDataFacet;
}


/**
 * Data facet instance method
 * Returns path to access this data facet from parent (using path method)
 *
 * @return {String}
 */
function Data$getPath() {
    return this._path;
}



/**
 * Data facet instance method
 * Returns key to access the value related to this data facet on the value related to parent data facet.
 * If component has List facet, returns index
 *
 * @return {String|Integer}
 */
function Data$getKey() {
    var path = this._path;
    return path[0] == '['
            ? +path.slice(1, -1) // remove "[" and "]"
            : path.slice(1) // remove leading "."
}


/**
 * Data facet instance method
 * Called by `Component.prototype.getState` to get facet's state
 * Returns DOM data
 *
 * @param {Boolean} deepState, true by default
 * @return {Object}
 */
function Data$getState(deepState) {
    return { state: this.get(deepState) };
}


/**
 * Data facet instance method
 * Called by `Component.prototype.setState` to set facet's state
 * Simply sets model data
 *
 * @param {Object} state data to set on facet's model
 */
function Data$setState(state) {
    return this.set(state.state);
}

},{"../../abstract/mixin":3,"../../messenger":69,"../../model/change_data":76,"../../model/m_path":80,"../../model/model_utils":81,"../../model/path_utils":83,"../../util/logger":98,"../c_facet":17,"../msg_api/data":36,"../msg_api/de_data":37,"../msg_src/dom_events":39,"./cf_registry":31,"mol-proto":109}],20:[function(require,module,exports){
'use strict';


var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry') 
    , _ = require('mol-proto')
    , check = require('../../util/check')
    , Match = check.Match
    , binder = require('../../binder')
    , BindAttribute = require('../../attributes/a_bind')
    , DomFacetError = require('../../util/error').DomFacet
    , domUtils = require('../../util/dom')
    , config = require('../../config')
    , doT = require('dot');


// data model connection facet
var Dom = _.createSubclass(ComponentFacet, 'Dom');

_.extend(Dom, {
    createElement: Dom$$createElement
});


/**
 * Facet class method
 * Creates an element from a passed configuation object
 * 
 * @param {Object} config with the properties `domConfig`, `content`, `template`
 * @return {Element} an html element 
 */
function Dom$$createElement(config) {
    var domConfig = config.domConfig || {}
        , tagName = domConfig.tagName || 'div'
        , newEl = document.createElement(tagName)
        , content = config.content
        , template = config.template;

    // TODO it will be called again when/if component is instantiated
    // Should be someproperty on element to indicate it's been called?
    _applyConfigToElement(newEl, domConfig);

    if (typeof content == 'string') {
        if (template)
            newEl.innerHTML = doT.template(template)({content: content});
        else
            newEl.innerHTML = content;
    }
    return newEl;
}


function _applyConfigToElement(el, config) {
    var cssClasses = config && config.cls
        , configAttributes = config && config.attributes;

    if (configAttributes)
        _.eachKey(configAttributes, function(attrValue, attrName) {
            el.setAttribute(attrName, attrValue);
        });

    if (cssClasses)
        _attachCssClasses(el, 'add', cssClasses);
}


_.extendProto(Dom, {
    start: start,

    show: show,
    hide: hide,
    toggle: toggle,
    detach: detach,
    remove: remove,
    append: append,
    prepend: prepend,
    appendChildren: appendChildren,
    prependChildren: prependChildren,
    insertAfter: insertAfter,
    insertBefore: insertBefore,
    appendToScopeParent: appendToScopeParent,
    children: Dom$children,
    setStyle: setStyle,
    setStyles: setStyles,
    copy: copy,
    createElement: createElement,

    addCssClasses: _.partial(_manageCssClasses, 'add'),
    removeCssClasses: _.partial(_manageCssClasses, 'remove'),
    toggleCssClasses: _.partial(_manageCssClasses, 'toggle'),

    find: find,
    hasTextBeforeSelection: hasTextBeforeSelection,
    hasTextAfterSelection: hasTextAfterSelection,

    treeIndexOf: treeIndexOf,
    insertAtTreeIndex: insertAtTreeIndex
});

facetsRegistry.add(Dom);

module.exports = Dom;


// start Dom facet
function start() {
    var el = this.owner.el;
    _applyConfigToElement(el, this.config);
    var currentStyle = window.getComputedStyle(el)
    this._visible = currentStyle && currentStyle.display != 'none';
}

// show HTML element of component
function show() {
    this.toggle(true);
}

// hide HTML element of component
function hide() {
    this.toggle(false);
}

// show/hide
function toggle(doShow) {
    doShow = typeof doShow == 'undefined'
                ? ! this._visible
                : !! doShow;

    this._visible = doShow;
    var el = this.owner.el;

    el.style.display = doShow ? 'block' : 'none';
}


function _manageCssClasses(methodName, cssClasses, enforce) {
    _attachCssClasses(this.owner.el, methodName, cssClasses, enforce);
}


function _attachCssClasses(el, methodName, cssClasses, enforce) {
    var classList = el.classList
        , doToggle = methodName == 'toggle';

    if (Array.isArray(cssClasses))
        cssClasses.forEach(callMethod);
    else if (typeof cssClasses == 'string')
        callMethod(cssClasses);
    else
        throw new DomFacetError('unknown type of CSS classes parameter');

    function callMethod(cssCls) {
        doToggle
            ? classList[methodName](cssCls, enforce)
            : classList[methodName](cssCls);
    }
}


function detach() {
    if (this.owner.el)  
        domUtils.detachComponent(this.owner.el);
}


function setStyle(property, value) {
    if (!this.owner.el) {
        throw new Error("Cannot call setStyle on owner with no element: " + this.owner.constructor.name);
    }
    this.owner.el.style[property] = value;
}

function setStyles(properties) {
    for (var property in properties)
        this.owner.el.style[property] = properties[property];
}


// create a copy of DOM element using facet config if set
function copy(isDeep) {
    return this.owner.el && this.owner.el.cloneNode(isDeep);
}


function createElement() {
    var newEl = Dom.createElement(this.config);
    return newEl;
}


// remove HTML element of component
function remove() {
    domUtils.removeElement(this.owner.el);
}

// append inside HTML element of component
function append(el) {
    this.owner.el.appendChild(el)
}

// prepend inside HTML element of component
function prepend(el) {
    var thisEl = this.owner.el
        , firstChild = thisEl.firstChild;
    if (firstChild)
        thisEl.insertBefore(el, firstChild);
    else
        thisEl.appendChild(el);
}

// appends children of element inside this component's element
function appendChildren(el) {
    while(el.childNodes.length)
        this.append(el.childNodes[0]);
}

// prepends children of element inside this component's element
function prependChildren(el) {
    while(el.childNodes.length)
        this.prepend(el.childNodes[el.childNodes.length - 1]);
}

function insertAfter(el) {
    var thisEl = this.owner.el
        , parent = thisEl.parentNode;    
    parent.insertBefore(el, thisEl.nextSibling);
}

function insertBefore(el) {
    var thisEl = this.owner.el
        , parent = thisEl.parentNode;
    parent.insertBefore(el, thisEl);
}


// appends component's element to scope parent. If it was alredy in DOM it will be moved
function appendToScopeParent() {
    var parent = this.owner.getScopeParent();
    if (parent) parent.el.appendChild(this.owner.el);
}


/**
 * Dom facet instance method
 * Returns the list of child elements of the component element
 *
 * @return {Array[Element]}
 */
function Dom$children() {
    return domUtils.children(this.owner.el);
}


var findDirections = {
    'up': 'previousNode',
    'down': 'nextNode'
};

// Finds component passing optional iterator's test
// in the same scope as the current component (this)
// by traversing DOM tree upwards (direction = "up")
// or downwards (direction = "down")
function find(direction, iterator) {
    if (! findDirections.hasOwnProperty(direction))
        throw new DomFacetError('incorrect find direction: ' + direction);

    var el = this.owner.el
        , scope = this.owner.scope
        , treeWalker = document.createTreeWalker(scope._rootEl, NodeFilter.SHOW_ELEMENT);

    treeWalker.currentNode = el;
    var nextNode = treeWalker[findDirections[direction]]()
        , componentsNames = Object.keys(scope)
        , found = false;

    while (nextNode) {
        var attr = new BindAttribute(nextNode);
        if (attr.node) {
            attr.parse().validate();
            if (scope.hasOwnProperty(attr.compName)) {
                var component = scope[attr.compName];
                if (! iterator || iterator(component)) {
                    found = true;
                    break;
                }
            }
        }
        treeWalker.currentNode = nextNode;
        nextNode = treeWalker[findDirections[direction]]();
    }

    if (found) return component;
}


// returns true if the element has text before selection
function hasTextBeforeSelection() {
    var selection = window.getSelection();
    if (! selection.isCollapsed) return true;
    if (selection.anchorOffset) return true;

    // walk up the DOM tree to check if there are text nodes before cursor
    var treeWalker = document.createTreeWalker(this.owner.el, NodeFilter.SHOW_TEXT);
    return treeWalker.previousNode();
}


function hasTextAfterSelection() {
    var selection = window.getSelection();
    if (! selection.isCollapsed) return true;
    if (selection.anchorOffset < selection.anchorNode.length) return true;

    // walk up the DOM tree to check if there are text nodes after cursor
    var treeWalker = document.createTreeWalker(this.owner.el, NodeFilter.SHOW_TEXT);
    treeWalker.currentNode = selection.anchorNode;
    var nextNode = treeWalker.nextNode();
    
    //To capture when treewalker gives us an empty text node (unknown reason)
    var isText = nextNode ? !nextNode.nodeValue == '' : false;

    return isText;
}


/**
 * Returns sequential index of element inside current component's element in DOM tree as traversed by TreeWalker.
 * Returns -1 if the element is not inside current component's element, 0 if the component's element is passed.
 * 
 * @param  {Element} el element to find the index of
 * @return {Number}
 */
function treeIndexOf(el) {
    return domUtils.treeIndexOf(this.owner.el, el);
}


/**
 * Inserts an element inside this component's element at a given index in tree (that has the same meaning as the index returned by `treeIndexOf` method). If element is already in the component's DOM tree, it will be removed first and then moved to the passed treeIndex.
 * If the index is out of bounds will insert as the lst child
 * Returns actual index at which the element was inserted (can be less than passed if out of bounds).
 * Insertion at index 0 will also return false as it would mean replacing the root element.
 * 
 * @param {Element} rootEl element into which to insert
 * @param {Number} treeIndex index in DOM tree inside root element (see treeIndexOf)
 * @param {Element} el element to be inserted
 */
function insertAtTreeIndex(treeIndex, el) {
    return domUtils.insertAtTreeIndex(this.owner.el, treeIndex, el);
}

},{"../../attributes/a_bind":5,"../../binder":9,"../../config":64,"../../util/check":88,"../../util/dom":91,"../../util/error":94,"../c_facet":17,"./cf_registry":31,"dot":107,"mol-proto":109}],21:[function(require,module,exports){
'use strict';

// <a name="components-facets-drag"></a>
// ###drag facet

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , DOMEventsSource = require('../msg_src/dom_events')
    , Component = require('../c_class')
    , DragDrop = require('../../util/dragdrop')
    , _ = require('mol-proto')
    , logger = require('../../util/logger');


/**
 * `milo.registry.facets.get('Drag')`
 * Facet for components that can be dragged
 * Drag facet supports the following configuration parameters:
 *
 *  - meta: object with properties
 *      - params: object of key-value pairs that will be converted in url-like query string in the end of data type for metadata data type (or function that returns this object). See config.dragDrop.dataTypes.componentMetaTemplate
 *          all values will converted to lowercase as datatype cannot store uppercase letters.
 *      - data: data that will be stored in the above meta data type (or function)
 *  - allowedEffects: string (or function) as specified here: https://developer.mozilla.org/en-US/docs/DragDrop/Drag_Operations#dragstart
 *
 * If function is specified in any parameter it will be called with the component as the context
 */
var Drag = _.createSubclass(ComponentFacet, 'Drag');

_.extendProto(Drag, {
    init: Drag$init,
    start: Drag$start,

    setHandle: Drag$setHandle
});

facetsRegistry.add(Drag);

module.exports = Drag;


function Drag$init() {
    ComponentFacet.prototype.init.apply(this, arguments);   

    this._createMessageSourceWithAPI(DOMEventsSource);
    this._dragData = {};

    var dataTypeInfo = this.config._dataTypeInfo || '';
    this._dataTypeInfo = typeof dataTypeInfo == 'function'
                            ? dataTypeInfo
                            : function() { return dataTypeInfo; };
}


/**
 * Drag facet instance method
 * Sets the drag handle element of component. This element has to be dragged for the component to be dragged.
 *
 * @param {Element} handleEl
 */
function Drag$setHandle(handleEl) {
    if (! this.owner.el.contains(handleEl))
        return logger.warn('drag handle should be inside element to be dragged')
    this._dragHandle = handleEl;
}


function Drag$start() {
    ComponentFacet.prototype.start.apply(this, arguments);
    _addDragAttribute.call(this);

    this.onMessages({
        'mousedown': onMouseDown,
        'mouseenter mouseleave mousemove': onMouseMovement,
        'dragstart': onDragStart,
        'drag': onDragging,
        'dragend': onDragEnd
    });

    this.owner.onMessages({
        'getstatestarted':
            { subscriber: _removeDragAttribute, context: this },
        'getstatecompleted':
            { subscriber: _addDragAttribute, context: this }
    });
}


/**
 * Adds draggable attribute to component's element
 *
 * @private
 */
function _addDragAttribute() {
    if (this.owner.el)
        this.owner.el.setAttribute('draggable', true);
}


function _removeDragAttribute() {
    if (this.owner.el)
        this.owner.el.removeAttribute('draggable');
}


function onMouseDown(eventType, event) {
    this.__mouseDownTarget = event.target;
    if (targetInDragHandle.call(this)) {
        window.getSelection().empty();
        event.stopPropagation();
    }
}


function onMouseMovement(eventType, event) {
    var shouldBeDraggable = targetInDragHandle.call(this);
    this.owner.el.setAttribute('draggable', shouldBeDraggable);
    if (document.body.getAttribute('data-dragEnableEvent') != 'false')
        event.stopPropagation();
}


function onDragStart(eventType, event) {
    event.stopPropagation();
    if (this.config.off || ! targetInDragHandle.call(this)) {
        event.preventDefault();
        return;
    }

    var owner = this.owner;
    var dt = new DragDrop(event);
    this._dragData = dt.setComponentState(owner);

    var metaConfig = this.config.meta
        , paramsConfig = metaConfig && metaConfig.params
        , metaDataConfig = metaConfig && metaConfig.data;

    var params = _.result(paramsConfig, owner)
        , data = _.result(metaDataConfig, owner);

    this._dragMetaDataType = dt.setComponentMeta(owner, params, data);
    this._dragMetaData = data;

    _setAllowedEffects.call(this, dt);

    DragDrop.service.postMessageSync('dragdropstarted', {
        eventType: 'dragstart',
        dragDrop: dt,
        dragFacet: this
    });
}


function onDragging(eventType, event) {
    if (_dragIsDisabled.call(this)) return;

    var dt = new DragDrop(event);
    dt.setComponentState(this.owner, this._dragData);
    dt.setData(this._dragMetaDataType, this._dragMetaData);
    _setAllowedEffects.call(this, dt);
}


function onDragEnd(eventType, event) {
    if (_dragIsDisabled.call(this)) return;

    event.stopPropagation();
    var dt = new DragDrop(event);
    DragDrop.service.postMessageSync('completedragdrop', {
        eventType: 'dragend',
        dragDrop: dt,
        dragFacet: this
    });
}


function _setAllowedEffects(DragDrop) {
    var effects = _.result(this.config.allowedEffects, this.owner);
    DragDrop.setAllowedEffects(effects);
}


function targetInDragHandle() {
    return ! this._dragHandle || this._dragHandle.contains(this.__mouseDownTarget);
}


function _dragIsDisabled() {
    if (this.config.off) {
        event.preventDefault();
        return true;
    }
}

},{"../../util/dragdrop":93,"../../util/logger":98,"../c_class":16,"../c_facet":17,"../msg_src/dom_events":39,"./cf_registry":31,"mol-proto":109}],22:[function(require,module,exports){
'use strict';

// <a name="components-facets-drop"></a>
// ###drop facet

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , DOMEventsSource = require('../msg_src/dom_events')
    , DragDrop = require('../../util/dragdrop')
    , DropError = require('../../util/error').Drop
    , _ = require('mol-proto')
    , _handleDropDependency;

/**
 * `milo.registry.facets.get('Drop')`
 * Facet for components that can accept drops
 * Drop facet supports the following configuration parameters:
 *
 *  - allow - an object that will define allowed data types during drag (`dragenter` and `dragover` events) with these properties:
 *      - components: `true` by default (all components will be accepted)
 *                        OR string with allowed component class
 *                        OR list of allowed components classes (strings)
 *                        OR map with allowed classes in keys and `true`/test functions in values
 *                        OR test function that will be passed object defined below
 *                        OR `false` to NOT accept components
 *      - dataTypes:  `false` by default (no other data types will be accepted)
 *                        OR string with allowed data type
 *                        OR list of additional data types that a drop target would accept
 *                        OR test function that will be passed DragDrop object
 *                        OR `true` to accept all data types
 *      - checkParent: `false` by default
 *                        OR `true` will call parent component drop allow to check if parent component will accept the component
 *      If test functions are used, they should return boolean. Each test function can also set drop effect as defined here:
 *      https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer#dropEffect.28.29
 *      Setting drop effect that is not allowed by dragged object will prevent drop.
 *      Test functions for components will be passed the owner of Drop facet as context, the object with the following possible properties as the first parameter:
 *          compClass - name of component class as stored in registry
 *          compName - name of component (all lowercase)
 *          params - parameters as encoded in dataType, passed to `milo.util.dragDrop.setComponentMeta` by Drag facet
 *          metaDataType - data type of the data that has compClass, compName and params encoded
 *
 *      ... and DragDrop instance as the second parameter
 *
 *      Test function for other data types will be passed the owner of Drop facet as context and DragDrop instance as the first parameter
 *
 * ####Events####
 *
 * In addition to configuring allowed components and data types, components classes should subscribe to events.
 * At the very least, they should subscribe to `drop` event.
 */
var Drop = _.createSubclass(ComponentFacet, 'Drop');


_.extendProto(Drop, {
    init: Drop$init,
    start: Drop$start
    // _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Drop);

module.exports = Drop;


function Drop$init() {
    ComponentFacet.prototype.init.apply(this, arguments);
    this._createMessageSourceWithAPI(DOMEventsSource);
}


function Drop$start() {
    ComponentFacet.prototype.start.apply(this, arguments);
    this.owner.el.classList.add('cc-module-relative');
    this.onMessages({
        'dragenter dragover': onDragging,
        'drop': onDrop
    });
}


function onDragging(eventType, event) {
    var dt = new DragDrop(event);

    event.stopPropagation();
    event.preventDefault();

    if (! _handleDropDependency.call(this, dt))
        dt.setDropEffect('none');
}


function onDrop(eventType, event) {
    event.stopPropagation();
    var dt = new DragDrop(event);
    DragDrop.service.postMessageSync('dragdropcompleted', {
        eventType: 'drop',
        dragDrop: dt,
        dropFacet: this
    });
}


_handleDropDependency = _.throttle(_handleDropDependencyNothrottle, 50);
function _handleDropDependencyNothrottle(dt, originalDropComponent) {
    var allow = this.config.allow
        , meta = dt.getComponentMeta()
        , parentAllowed = true;

    originalDropComponent = originalDropComponent || this.owner;

    if (allow && allow.checkParent) {
        var parent = this.owner.getScopeParent('Drop');
        if (parent)
            parentAllowed = _handleDropDependencyNothrottle.call(parent.drop, dt, originalDropComponent);
    }

    return parentAllowed && _isDropAllowed.call(this, dt, originalDropComponent);
}


/**
 * Checks if drop is allowed based on facet configuration (see above)
 * 
 * @param {DragDrop} dt
 * @return {Boolean}
 */
function _isDropAllowed(dt, originalDropComponent) {
    var allow = this.config.allow;

    if (dt.isComponent()) {
        var allowComps = allow && allow.components
            , meta = dt.getComponentMeta();

        switch (typeof allowComps) {
            case 'undefined':
                return true;
            case 'boolean':
                return allowComps;
            // component class
            case 'string':
                return meta && meta.compClass == allowComps;
            // test function
            case 'function':
                return allowComps.call(this.owner, meta, dt, originalDropComponent);
            case 'object':
                if (Array.isArray(allowComps))
                    // list of allowed classes
                    return allowComps.indexOf(meta && meta.compClass) >= 0;
                else {
                    // map of class: boolean|test function
                    var test = allowComps[meta && meta.compClass];
                    return !! _.result(test, this.owner, meta, dt);
                }
            default:
                throw new DropError('Incorrect allowed components in config');
        }
    } else {
        var dataTypes = allow && allow.dataTypes
        switch (typeof dataTypes) {
            case 'undefined':
                return false;
            case 'string':
                return dt.types.indexOf(dataTypes) >= 0;
        }
    }

    // TODO test for other data types
}

},{"../../util/dragdrop":93,"../../util/error":94,"../c_facet":17,"../msg_src/dom_events":39,"./cf_registry":31,"mol-proto":109}],23:[function(require,module,exports){
'use strict';

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , Messenger = require('../../messenger')
    , DOMEventsSource = require('../msg_src/dom_events')
    , _ = require('mol-proto');


/**
 * `milo.registry.facets.get('Events')`
 * Component facet that manages subscriptions to DOM events using [Messenger](../../messenger/index.js.html) with [DOMEventsSource](../msg_src/dom_events.js.html).
 * All public methods of Messenger and `trigger` method of [DOMEventsSource](../msg_src/dom_events.js.html) are proxied directly to this facet.
 * For example, to subscribe to `click` event use:
 * ```
 * component.frame.on('click', function() {
 *     // ...
 * });
 * ```
 * See [Messenger](../../messenger/index.js.html)
 */
var Events = _.createSubclass(ComponentFacet, 'Events');


/**
 * ####Events facet instance methods####
 *
 * - [init](#Events$init) - called by constructor automatically
 */
_.extendProto(Events, {
    init: Events$init
    // _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Events);

module.exports = Events;


/**
 * Events facet instance method
 * Initialzes facet, connects DOMEventsSource to facet's messenger
 */
function Events$init() {
    ComponentFacet.prototype.init.apply(this, arguments);

    var domEventsSource = new DOMEventsSource(this, { trigger: 'trigger' }, undefined, this.owner);
    this._setMessageSource(domEventsSource);
    _.defineProperty(this, '_domEventsSource', domEventsSource);
}

},{"../../messenger":69,"../c_facet":17,"../msg_src/dom_events":39,"./cf_registry":31,"mol-proto":109}],24:[function(require,module,exports){
'use strict';


var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , Messenger = require('../../messenger')
    , FrameMessageSource = require('../msg_src/frame')
    , domEventsConstructors = require('../msg_src/de_constrs')
    , _ = require('mol-proto');


/**
 * `milo.registry.facets.get('Frame')`
 * Component facet that simplifies sending window messages to iframe and subscribing to messages on inner window of iframe.
 * All public methods of Messenger and `trigger` method of [FrameMessageSource](../msg_src/frame.js.html) are proxied directly to this facet.
 * For example, to send custom message to iframe window use:
 * ```
 * iframeComponent.frame.trigger('mymessage', myData);
 * ```
 * To subscribe to this messages inside frame use (with milo - see [milo.mail](../../mail/index.js.html)):
 * ```
 * milo.mail.on('message:mymessage', function(msgType, msgData) {
 *     // data is inside of window message data
 *     // msgType == 'message:mymessage'
 *     var myData = msgData.data;
 *     // ... app logic here
 * });
 * ```
 * or without milo:
 * ```
 * window.attachEventListener('message', function(message) {
 *     var msgType = message.type; // e.g., 'mymessage'
 *     var myData = message.data;
 *     // ... message routing and code here
 * });
 * ```
 * Milo does routing based on sent message type automatically.
 * See [Messenger](../../messenger/index.js.html) and [milo.mail](../../mail/index.js.html).
 */
 var Frame = _.createSubclass(ComponentFacet, 'Frame');


/**
 * Calls passed function when frame DOM becomes ready. If already ready calls immediately
 */
var Frame$whenReady = _makeWhenReadyFunc(Frame$isReady, 'domready');

/**
 * Calls passed function when frame milo becomes ready. If already ready calls immediately
 */
var Frame$whenMiloReady = _makeWhenReadyFunc(Frame$isMiloReady, 'message:miloready');


/**
 * ####Events facet instance methods####
 *
 * - [init](#Frame$init) - called by constructor automatically
 */
_.extendProto(Frame, {
    init: Frame$init,
    start: Frame$start,
    getWindow: Frame$getWindow,
    isReady: Frame$isReady,
    whenReady: Frame$whenReady,
    isMiloReady: Frame$isMiloReady,
    whenMiloReady: Frame$whenMiloReady,
    milo: Frame$milo
    // _reattach: _reattachEventsOnElementChange
});


facetsRegistry.add(Frame);

module.exports = Frame;


/**
 * Frame facet instance method
 * Initialzes facet, connects FrameMessageSource to facet's messenger
 */
function Frame$init() {
    ComponentFacet.prototype.init.apply(this, arguments);
    
    var messageSource = new FrameMessageSource(this, { trigger: 'trigger' }, undefined, this.owner);
    this._setMessageSource(messageSource);

    _.defineProperty(this, '_messageSource', messageSource);
}


/**
 * Frame facet instance method
 * Emits frameloaded event when ready.
 */
function Frame$start() {
    ComponentFacet.prototype.start.apply(this, arguments);
    var self = this;
    milo(postDomReady);

    function postDomReady(event) {
        self.postMessage('domready', event);
    }
}


/**
 * Frame facet instance method
 * Retrieves the internal window of the frame 
 *
 * @param {Window}
 */
function Frame$getWindow() {
    return this.owner.el.contentWindow;
}


/**
 * Frame facet instance method
 * Returns document.readyState if frame doument state is 'interactive' or 'complete', false otherwise
 *
 * @return {String|Boolean}
 */
function Frame$isReady() {
    var readyState = this.getWindow().document.readyState;
    return  readyState != 'loading' ? readyState : false;
}


/**
 * Frame facet instance method
 * Returns true if milo is loaded and has finished initializing inside the frame
 *
 * @return {Boolean}
 */
function Frame$isMiloReady() {
    var frameMilo = this.getWindow().milo;
    return this.isReady() && frameMilo && frameMilo.milo_version;
}


/**
 * Gives access to milo in the frame (assuming it is loaded there)
 * Calls function when both milo and DOM are ready if function is passed.
 * Returns the reference to milo inside the frame if the window is already available.
 * 
 * @param {Function} func function to be called when milo and DOM are ready in the frame
 * @return {Function} reference to milo in the frame 
 */
function Frame$milo(func) {
    if (typeof func == 'function') {
        var self = this;
        this.whenMiloReady(function() {
            self.getWindow().milo(func)
        });
    }
    var win = this.getWindow();
    return win && win.milo;
}


function _makeWhenReadyFunc(isReadyFunc, event) {
    return function Frame_whenReadyFunc(func) { // , arguments
        var self = this
            , args = _.slice(arguments, 1);
        if (isReadyFunc.call(this))
            callFunc();
        else
            this.on(event, callFunc);

        function callFunc() {
            func.apply(self, args);
        }
    }
}

},{"../../messenger":69,"../c_facet":17,"../msg_src/de_constrs":38,"../msg_src/frame":40,"./cf_registry":31,"mol-proto":109}],25:[function(require,module,exports){
'use strict';


var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , Model = require('../../model')
    , _ = require('mol-proto')
    , miloMail = require('../../mail');


var ItemFacet = _.createSubclass(ComponentFacet, 'Item');

_.extendProto(ItemFacet, {
    getState: ItemFacet$getState,
    setState: ItemFacet$setState,
    getIndex: ItemFacet$getIndex,
    setIndex: ItemFacet$setIndex,
    removeItem: ItemFacet$removeItem,
    require: ['Container', 'Dom', 'Data']
});

facetsRegistry.add(ItemFacet);

module.exports = ItemFacet;


function ItemFacet$getState() {
    return { state: {
        index: this.getIndex()
    }};
}


function ItemFacet$setState(state) {
    this.setIndex(state.state.index);
}


function ItemFacet$getIndex() {
    return this.index;
}


function ItemFacet$setIndex(index) {
    this.index = index;
}


/**
 * ItemFacet instance method
 * Removes component from the list
 */
function ItemFacet$removeItem() {
    // this.list and this.index are set by the list when the item is added
    this.list.removeItem(this.index, true);
}

},{"../../mail":66,"../../model":78,"../c_facet":17,"./cf_registry":31,"mol-proto":109}],26:[function(require,module,exports){
'use strict';

var ComponentFacet = require('../c_facet')
    , Component = require('../c_class')
    , facetsRegistry = require('./cf_registry')
    , Model = require('../../model')
    , _ = require('mol-proto')
    , miloMail = require('../../mail')
    , miloBinder = require('../../binder')
    , miloUtil = require('../../util')
    , ListError = miloUtil.error.List
    , logger = miloUtil.logger
    , doT = require('dot')
    , check = miloUtil.check
    , Match = check.Match
    , domUtils = miloUtil.dom
    , miloConfig = require('../../config');


var LIST_SAMPLE_CSS_CLASS = 'ml-list-item-sample';


// Data model connection facet
var List = _.createSubclass(ComponentFacet, 'List');

_.extendProto(List, {
    init: init,
    start: start,

    require: ['Container', 'Dom', 'Data'],
    _itemPreviousComponent: _itemPreviousComponent,

    item: item,
    count: count,
    _setItem: _setItem,
    contains: contains,
    addItem: addItem,
    addItems: List$addItems,
    removeItem: removeItem,
    each: each
});

facetsRegistry.add(List);

module.exports = List;


// Initialize List facet
function init() {
    ComponentFacet.prototype.init.apply(this, arguments);
    var model = new Model
        , self = this;

    _.defineProperties(this, {
        _listItems: [],
        _listItemsHash: {}
    });
    _.defineProperty(this, 'itemSample', null, _.WRIT);
}

function start() {
    // Fired by __binder__ when all children of component are bound
    this.owner.on('childrenbound', onChildrenBound);
}

function onChildrenBound() {
    // get items already in the list
    var children = this.dom.children()
        , items = this.list._listItems
        , itemsHash = this.list._listItemsHash;

    children && children.forEach(function(childEl) {
        var comp = Component.getComponent(childEl);
        if (comp && comp.item) {
            items.push(comp);
            itemsHash[comp.name] = comp;
            comp.item.list = this.list;
        }
    }, this);

    if (items.length) {
        var foundItem = items[0];
        items.splice(0, 1);
        delete itemsHash[foundItem.name];
        items.forEach(function(item, index) {
            item.item.setIndex(index);
        });
    }
    
    // Component must have one child with an Item facet 
    if (! foundItem) throw new ListError('No child component has Item facet');

    this.list.itemSample = foundItem;

    // After keeping a reference to the item sample, it must be hidden and removed from scope
    foundItem.dom.hide();
    foundItem.remove(true);
    foundItem.dom.removeCssClasses(LIST_SAMPLE_CSS_CLASS);

    // remove references to components from sample item
    foundItem.walkScopeTree(function(comp) {
        delete comp.el[miloConfig.componentRef];
    });

    // create item template to insert many items at once
    var itemElCopy = foundItem.el.cloneNode(true);
    var attr = foundItem.componentInfo.attr;
    var attrCopy = _.clone(attr);
    attr.compName = '{{= it.componentName() }}';
    attr.el = itemElCopy;
    attr.decorate();

    var itemsTemplateStr = 
          '{{ var i = it.count; while(i--) { }}'
        + itemElCopy.outerHTML
        + '{{ } }}';

    this.list.itemsTemplate = doT.compile(itemsTemplateStr);
}

// Return a list item by it's index
function item(index) {
    return this._listItems[index];
}

// Get total number of list items
function count() {
    return this._listItems.length;
}


function _setItem(index, component) {
    this._listItems.splice(index, 0, component);
    this._listItemsHash[component.name] = component;
    component.item.list = this;
    component.item.setIndex(+index);
}

// Does the list contain a particular list item component
function contains(component) {
    return this._listItemsHash[component.name] == component;
}

// Add a new list item at a particular index
function addItem(index) {
    index = index || this.count();
    if (this.item(index))
        throw ListError('attempt to create item with ID of existing item');

    // Copy component
    var component = Component.copy(this.itemSample, true);
    var prevComponent = this._itemPreviousComponent(index);

    if (!prevComponent.el.parentNode)
        return logger.warn('list item sample was removed from DOM, probably caused by wrong data. Reset list data with array');

    // Add it to the DOM
    prevComponent.dom.insertAfter(component.el);

    // Add to list items
    this._setItem(index, component);

    // Show the list item component
    component.el.style.display = '';

    _updateItemsIndexes.call(this, index + 1);

    return component;
}


function _updateItemsIndexes(fromIndex, toIndex) {
    fromIndex = fromIndex || 0;
    toIndex = toIndex || this.count();
    for (var i = fromIndex; i < toIndex; i++) {
        var component = this._listItems[i];
        if (component)
            component.item.setIndex(i);
        else
            logger.warn('List: no item at position', i);
    }
}


/**
 * List facet instance method
 * Adds a given number of items using template rendering rather than adding elements one by one
 *
 * @param {Integer} count number of items to add
 * @param {[Integer]} index optional index of item after which to add
 */
function List$addItems(count, index) {
    check(count, Match.Integer);
    if (count < 0)
        throw new ListError('can\'t add negative number of items');

    if (count == 0) return;

    var itemsHTML = this.itemsTemplate({
        componentName: miloUtil.componentName,
        count: count
    });

    var wrapEl = document.createElement('div');
    wrapEl.innerHTML = itemsHTML;

    miloBinder(wrapEl, this.owner.container.scope);
    var children = domUtils.children(wrapEl);

    if (count != children.length)
        logger.error('number of items added is different from requested');

    if (children && children.length) {
        var listLength = this.count();
        var spliceIndex = index < 0
                            ? 0
                            : typeof index == 'undefined' || index > listLength
                                ? listLength
                                : index;

        var prevComponent = spliceIndex == 0
                                ? this.itemSample
                                : this._listItems[spliceIndex - 1];

        var frag = document.createDocumentFragment()
            , newComponents = [];

        children.forEach(function(el, i) {
            var component = Component.getComponent(el);
            if (! component)
                return logger.error('List: element in new items is not a component');
            newComponents.push(component);
            this._setItem(spliceIndex++, component);
            frag.appendChild(el);
            el.style.display = '';
        }, this);

        _updateItemsIndexes.call(this, spliceIndex);

        if (!prevComponent.el.parentNode)
            return logger.warn('list item sample was removed from DOM, probably caused by wrong data. Reset list data with array');

        // Add it to the DOM
        prevComponent.dom.insertAfter(frag);

        _.deferMethod(newComponents, 'forEach', function(comp) {
            comp.broadcast('stateready');
        });
    }
}


// Remove item from a particular index
function removeItem(index) {
    var comp = this.item(index);

    if (! comp)
        return logger.warn('attempt to remove list item with id that does not exist');

    this._listItems[index] = undefined;
    delete this._listItemsHash[comp.name];
    comp.destroy();

    this._listItems.splice(index, 1);
    _updateItemsIndexes.call(this, index);
}

// Returns the previous item component given an index
function _itemPreviousComponent(index) {
    while (index >= 0 && ! this._listItems[index])
        index--;

    return index >= 0
                ? this._listItems[index]
                : this.itemSample;
}

// Performs a callback on each list item
function each(callback, thisArg) {
    this._listItems.forEach(function(item) {
        if (item) callback.apply(this, arguments);
    }, thisArg || this);
}

},{"../../binder":9,"../../config":64,"../../mail":66,"../../model":78,"../../util":96,"../c_class":16,"../c_facet":17,"./cf_registry":31,"dot":107,"mol-proto":109}],27:[function(require,module,exports){
'use strict';

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , Model = require('../../model')

    , _ = require('mol-proto');


// generic drag handler, should be overridden
var ModelFacet = _.createSubclass(ComponentFacet, 'Model');

_.extendProto(ModelFacet, {
    init: ModelFacet$init,
    getState: ModelFacet$getState,
    setState: ModelFacet$setState,
    _createMessenger: ModelFacet$_createMessenger
});

facetsRegistry.add(ModelFacet);

module.exports = ModelFacet;


function ModelFacet$init() {
    this.m = new Model(this.config.data, this);
    ComponentFacet.prototype.init.apply(this, arguments);
    this.m.proxyMethods(this); // Creates model's methods directly on facet
}


/**
 * ModelFacet instance method
 * Called by `Component.prototype.getState` to get facet's state
 * Simply returns model data
 *
 * @return {Object}
 */
function ModelFacet$getState() {
    var modelValue = this.m.get();
    if (typeof modelValue == 'object')
        modelValue = _.deepClone(modelValue);
    return { state: modelValue };
}


/**
 * ModelFacet instance method
 * Called by `Component.prototype.setState` to set facet's state
 * Simply sets model data
 *
 * @param {Object} state data to set on facet's model
 */
function ModelFacet$setState(state) {
    return this.m.set(state.state);
}


function ModelFacet$_createMessenger() { // Called by inherited init
    this.m.proxyMessenger(this); // Creates messenger's methods directly on facet
}

},{"../../model":78,"../c_facet":17,"./cf_registry":31,"mol-proto":109}],28:[function(require,module,exports){
'use strict';

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')
    , Model = require('../../model')

    , _ = require('mol-proto');


// generic drag handler, should be overridden
var Options = _.createSubclass(ComponentFacet, 'Options');

_.extendProto(Options, {
    init: Options$init,
    _createMessenger: Options$_createMessenger
});

facetsRegistry.add(Options);

module.exports = Options;


function Options$init() {
    this.m = new Model(this.config.options, this);
    ComponentFacet.prototype.init.apply(this, arguments);
    this.m.proxyMethods(this); // Creates model's methods directly on facet
}


function Options$_createMessenger() { // Called by inherited init
    this.m.proxyMessenger(this); // Creates messenger's methods directly on facet
}

},{"../../model":78,"../c_facet":17,"./cf_registry":31,"mol-proto":109}],29:[function(require,module,exports){
'use strict';

// <a name="components-facets-template"></a>
// ###template facet

// simplifies rendering of component element from template.
//   Any templating enging can be used that supports template compilation
//   (or you can mock this compilation easily by creating closure storing
//   template string in case your engine doesn't support compilation).
//   By default milo uses [doT](), the most versatile, conscise and at the
//   same time the fastest templating engine.
//   If you use milo in browser, it is the part of milo bundle and available
//   as global variable `doT`.

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry') 
    , _ = require('mol-proto')
    , check = require('../../util/check')
    , Match = check.Match
    , binder = require('../../binder');


// data model connection facet
var Template = _.createSubclass(ComponentFacet, 'Template');

_.extendProto(Template, {
    init: Template$init,
    start: Template$start,
    set: Template$set,
    render: Template$render,
    binder: Template$binder

    // _reattach: _reattachEventsOnElementChange
});

facetsRegistry.add(Template);

module.exports = Template;


function Template$init() {
    ComponentFacet.prototype.init.apply(this, arguments);

    // templates are interpolated with default (doT) or configured engine (this.config.compile)
    // unless this.config.interpolate is false
    var compile = this.config.interpolate === false
                    ? undefined
                    : this.config.compile || milo.config.template.compile;

    this.set(this.config.template || '', compile);
}


function Template$start() {
    ComponentFacet.prototype.start.apply(this, arguments);
    if (this.config.autoRender) {
        this.render();
        if (this.config.autoBinder)
            this.binder();
    }
}


function Template$set(templateStr, compile) {
    check(templateStr, String);
    check(compile, Match.Optional(Function));

    this._templateStr = templateStr;
    if (compile)
        this._compile = compile;
    else
        compile = this._compile;

    if (compile)
        this._template = compile(templateStr);

    return this;
}


function Template$render(data) { // we need data only if use templating engine
    this.owner.el.innerHTML = this._template
                                ? this._template(data)
                                : this._templateStr;

    return this;
}


function Template$binder() {
    if (this.owner.container)
        this.owner.container.binder();
    else
        logger.error('TemplateFacet: Binder called without container facet.');
}

},{"../../binder":9,"../../util/check":88,"../c_facet":17,"./cf_registry":31,"mol-proto":109}],30:[function(require,module,exports){
'use strict';

var ComponentFacet = require('../c_facet')
    , facetsRegistry = require('./cf_registry')

    , _ = require('mol-proto');


/**
 * Transfer facet is designed for components to be able to represent other components
 * If a [Component](../c_class.js.html) has Transfer facet, when `Component.getState` is called for this componet it returns previously saved data, possibly from another component.
 * For example, a list of documents can use this facet so that each item in the list can store actual document component on it.
 */
var Transfer = _.createSubclass(ComponentFacet, 'Transfer');

_.extendProto(Transfer, {
    init: Transfer$init,
    getState: Transfer$getState,
    setState: Transfer$setState,
    getComponentMeta: Transfer$getComponentMeta
});

facetsRegistry.add(Transfer);

module.exports = Transfer;


function Transfer$init() {
    ComponentFacet.prototype.init.apply(this, arguments);
    this._state = undefined;
}


/**
 * Transfer facet instance method
 * Returns transfer state for component. Can be obtained from another component by using `Component.getState`
 *
 * @return {Object}
 */
 function Transfer$getState() {
    return this._state;
 }


/**
 * Transfer facet instance method
 * Sets transfer state for component. Can be obtained from another component by using `Component.getState`
 *
 * @param {Object} state
 */
 function Transfer$setState(state) {
    this._state = state;
 }


function Transfer$getComponentMeta() {
    var state = this._state;
    return {
        compName: state && state.compName,
        compClass: state && state.compClass
    };
}

},{"../c_facet":17,"./cf_registry":31,"mol-proto":109}],31:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../../abstract/registry')
    , ComponentFacet = require('../c_facet');


/**
 * `milo.registry.facets`
 * Component facets registry. An instance of [ClassRegistry](../../abstract/registry.js.html) class that is used by milo to register and find facets.
 */
 var facetsRegistry = new ClassRegistry(ComponentFacet);


// Adds common ancestor to all facets of components to the registry.
facetsRegistry.add(ComponentFacet);

module.exports = facetsRegistry;

},{"../../abstract/registry":4,"../c_facet":17}],32:[function(require,module,exports){
'use strict';

var componentsRegistry = require('./c_registry')
    , facetsRegistry = require('./c_facets/cf_registry')
    , componentName = require('../util/component_name')
    , BinderError = require('../util/error').Binder
    , logger = require('../util/logger')
    , _ = require('mol-proto');


module.exports = ComponentInfo;


/**
 * Simple class to hold information allowing to create/copy component using [`Component.create`](./c_class.js.html#create) and [`Component.copy`](./c_class.js.html#copy).
 *
 * @constructor
 * @param {Scope} scope scope object the component belogs to, usually either top level scope that will be returned by [milo.binder](../binder.js.html) or `scope` property of [Container](./c_facets/Container.js.html) facet of containing component
 * @param {Element} el DOM element the component is attached to
 * @param {BindAttribute} attr BindAttribute instance that the component was created with
 * @param {Boolean} throwOnErrors If set to false, then errors will only be logged to console. True by default.
 * @return {ComponentInfo}
 */
function ComponentInfo(scope, el, attr, throwOnErrors) {
    attr.parse().validate();

    this.scope = scope;
    this.el = el;
    this.attr = attr;
    this.name = attr.compName;
    this.ComponentClass = getComponentClass(attr, throwOnErrors);
    this.extraFacetsClasses = getComponentExtraFacets(this.ComponentClass, attr, throwOnErrors);

    if (this.ComponentClass
            && hasContainerFacet(this.ComponentClass, this.extraFacetsClasses)) {
        this.container = {};
    }
}


/**
 * ####ComponentInfo instance methods####
 * 
 * - [destroy](#ComponentInfo$destroy)
 * - [rename](#ComponentInfo$rename)
 */
_.extendProto(ComponentInfo, {
    destroy: ComponentInfo$destroy,
    rename: ComponentInfo$rename
});


/**
 * ComponentInfo instance method
 * Destroys ComponentInfo by removing the references to DOM element
 */
function ComponentInfo$destroy() {
    delete this.el;
    this.attr.destroy();
}


/**
 * ComponentInfo instance method
 * Renames ComponentInfo object
 *
 * @param {[String]} name optional new component name, generated from timestamp by default
 * @param {[Boolean]} renameInScope optional false to not rename ComponentInfo object in its scope, true by default
 */
function ComponentInfo$rename(name, renameInScope) {
    name = name || componentName();
    if (this.scope && renameInScope !== false) {
        this.scope._remove(this.name);
        this.scope._add(this, name);
    } else
        this.name = name;

    this.attr.compName = name;
    this.attr.decorate();
}


function getComponentClass(attr, throwOnErrors) {
    var ComponentClass = componentsRegistry.get(attr.compClass);
    if (! ComponentClass)
        reportBinderError(throwOnErrors, 'class ' + attr.compClass + ' is not registered');
    return ComponentClass;
}


function getComponentExtraFacets(ComponentClass, attr, throwOnErrors) {
    var facets = attr.compFacets
        , extraFacetsClasses = {};

    if (Array.isArray(facets))
        facets.forEach(function(fctName) {
            fctName = _.firstUpperCase(fctName);
            if (ComponentClass.hasFacet(fctName))
                reportBinderError(throwOnErrors, 'class ' + ComponentClass.name
                                      + ' already has facet ' + fctName);
            if (extraFacetsClasses[fctName])
                reportBinderError(throwOnErrors, 'component ' + attr.compName
                                      + ' already has facet ' + fctName);
            var FacetClass = facetsRegistry.get(fctName);
            extraFacetsClasses[fctName] = FacetClass;
        });

    return extraFacetsClasses;
}


function reportBinderError(throwOnErrors, message) {
    if (throwOnErrors === false)
        logger.error('ComponentInfo binder error:', message);
    else
        throw new BinderError(message);
};


function hasContainerFacet(ComponentClass, extraFacetsClasses) {
    return (ComponentClass.hasFacet('container')
        || 'Container' in extraFacetsClasses
        || _.someKey(extraFacetsClasses, facetRequiresContainer)
        || classHasFacetThatRequiresContainer());

    function classHasFacetThatRequiresContainer() {
        return (ComponentClass.prototype.facetsClasses
            && _.someKey(ComponentClass.prototype.facetsClasses, facetRequiresContainer))
    }

    function facetRequiresContainer(FacetClass) {
        return FacetClass.requiresFacet('container');
    }
}

},{"../util/component_name":89,"../util/error":94,"../util/logger":98,"./c_facets/cf_registry":31,"./c_registry":33,"mol-proto":109}],33:[function(require,module,exports){
'use strict';

var ClassRegistry = require('../abstract/registry')
    , Component = require('./c_class');

/**
 * `milo.registry.components`
 * An instance of [ClassRegistry](../abstract/registry.js.html) class that is used by milo to register and find components.
 */
var componentsRegistry = new ClassRegistry(Component);

// add common ancestor to all components to the registry.
componentsRegistry.add(Component);

module.exports = componentsRegistry;

},{"../abstract/registry":4,"./c_class":16}],34:[function(require,module,exports){
'use strict';

var config = require('../config')
    , check = require('../util/check')
    , Match = check.Match;


var componentUtils = module.exports = {
    isComponent: isComponent,
    getComponent: getComponent,
    getContainingComponent: getContainingComponent,
    _makeComponentConditionFunc: _makeComponentConditionFunc
};


/**
 * isComponent
 *
 * Checks if element has a component attached to it by
 * checking the presence of property difined in milo.config
 *
 * @param {Element} el DOM element
 * @return {Boolean} true, if it has milo component attached to it
 */
function isComponent(el) {
    return el.hasOwnProperty(config.componentRef);
}


/**
 * getComponent
 *
 * @param {Element} el DOM element
 * @return {Component} component attached to element
 */
function getComponent(el) {
    return el && el[config.componentRef];
}


/**
 * Returns the closest component which contains the specified element,
 * optionally, only component that passes `condition` test or contains specified facet
 *
 * Unless `returnCurrent` parameter is false, the function will return
 * the current component of the element (true by default).
 *
 * @param {Node} node DOM Element or text Node
 * @param {Boolean} returnCurrent optional boolean value indicating whether the component of the element can be returned. True by default, should be false to return only ancestors.
 * @param {Function|String} conditionOrFacet optional condition that component should pass (or facet name it should contain)
 * @return {Component} 
 */
function getContainingComponent(node, returnCurrent, conditionOrFacet) {
    // check(node, Node); - can't check tiype here as it is most likely coming from another frame
    check(returnCurrent, Match.Optional(Boolean));
    check(conditionOrFacet, Match.Optional(Match.OneOf(Function, String)));

    var conditionFunc = _makeComponentConditionFunc(conditionOrFacet);

    return _getContainingComponent(node, returnCurrent, conditionFunc);
}


function _makeComponentConditionFunc(conditionOrFacet) {
    if (typeof conditionOrFacet == 'function')
        return conditionOrFacet;
    else if (typeof conditionOrFacet == 'string') {
        var facetName = _.firstLowerCase(conditionOrFacet);
        return function (comp) {
           return comp.hasFacet(facetName);
        };
    }
}


function _getContainingComponent(el, returnCurrent, conditionFunc) {
    // Where the current element is a component it should be returned
    // if returnCurrent is true or undefined
    if (returnCurrent !== false) {
        var comp = getComponent(el);
        if (comp && (! conditionFunc || conditionFunc(comp)))
            return comp;
    }

    // Where there is no parent element, this function will return undefined
    // The parent element is checked recursively
    if (el.parentNode)
        return _getContainingComponent(el.parentNode, true, conditionFunc);
}

},{"../config":64,"../util/check":88}],35:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry');


var View = Component.createComponentClass('View', ['container']);

componentsRegistry.add(View);

module.exports = View;

},{"../c_class":16,"../c_registry":33}],36:[function(require,module,exports){
'use strict';


var MessengerAPI = require('../../messenger/m_api')
    , getElementDataAccess = require('./de_data')
    , _ = require('mol-proto')
    , check = require('../../util/check')
    , Match = check.Match;


// class to handle subscribtions to changes in DOM for UI (maybe also content editable) elements

/**
 * A class
 */
var DataMsgAPI = _.createSubclass(MessengerAPI, 'DataMsgAPI', true);


_.extendProto(DataMsgAPI, {
    // implementing MessageSource interface
    init: DataMsgAPI$init,
    translateToSourceMessage: translateToSourceMessage,
    filterSourceMessage: filterSourceMessage,
    createInternalData: createInternalData,

    // class specific methods
    value: DataMsgAPI$value
});

module.exports = DataMsgAPI;


function DataMsgAPI$init(component) {
    MessengerAPI.prototype.init.apply(this, arguments);

    this.component = component;
    this.elData = getElementDataAccess(component.el);
}


// getDomElementDataValue
function DataMsgAPI$value() { // value method
    var componentGetter = this.component.data.config.get;
    var newValue = typeof componentGetter == 'function'
                    ? componentGetter.call(this.component)
                    : this.elData.get(this.component.el);

    this.component.data._value = newValue;

    return newValue;
}


// TODO: this function should return relevant DOM event dependent on element tag
// Can also implement beforedatachanged event to allow preventing the change
// translateToDomEvent
function translateToSourceMessage(message) {
    var componentEvent = this.component.data.config.event;
    var event = componentEvent || this.elData.event(this.component.el);

    if (message == '' && event)
        return event;  // this.tagEvent;
}


// filterDataMessage
function filterSourceMessage(sourceMessage, message, data) {
    return data.newValue != data.oldValue;
}


function createInternalData(sourceMessage, message, data) {
    var oldValue = this.component.data._value
        , newValue = this.value();

    var internalData = { 
        path: '',
        type: 'changed',
        oldValue: oldValue,
        newValue: newValue
    };
    return internalData;
}

},{"../../messenger/m_api":70,"../../util/check":88,"./de_data":37,"mol-proto":109}],37:[function(require,module,exports){
'use strict';


var _ = require('mol-proto');


/**
 * Returns data access methods and events for given DOM element.
 * Used by [Data](../c_facets/Data.js.html) facet and by [DataMsgAPI](./data.js.html)
 *
 * @param {Element} el
 * @return {Object}
 */
var getElementDataAccess = function(el) {
    var tagName = el.tagName.toLowerCase()
        , elData = domElementsDataAccess[tagName];
    return elData || domElementsDataAccess.byDefault;
}

module.exports = getElementDataAccess;


/**
 * Data access methods and events for DOM elements.
 */
var domElementsDataAccess = {
    byDefault: {
        property: 'innerHTML',
    },
    'div': {
        property: 'innerHTML', // hack, should be innerHTML? to make work with Editable facet
        // event: 'input'
    },
    'span': {
        property: 'innerHTML',
        event: 'input'
    },
    'p': {
        property: 'innerHTML',
        event: 'input'
    },
    'input': {
        property: inputDataProperty,
        event: inputChangeEvent
    },
    'textarea': {
        property: 'value',
        event: 'input'
    },
    'select': {
        property: 'value',
        event: 'change'
    },
    'img': {
        property: 'src'
    }
};


// convert strings to functions and create getset methods
_.eachKey(domElementsDataAccess, function(tagInfo) {
    var property = tagInfo.property
        , event = tagInfo.event;
    if (typeof property != 'function')
        tagInfo.property = function() { return property; };
    var propFunc = tagInfo.property;
    if (typeof event != 'function')
        tagInfo.event = function() { return event; };
    if (! tagInfo.get)
        tagInfo.get = function(el) { return el[propFunc(el)]; }
    if (! tagInfo.set)
        tagInfo.set = function(el, value) {
            return (el[propFunc(el)] = typeof value == 'undefined' ? '' : value);
        }
});


/**
 * Types of input elements
 */
var inputElementTypes = {
    byDefault: {
        property: 'value',
        event: 'input'
    },
    'checkbox': {
        property: 'checked',
        event: 'change'
    },
    'radio': {
        property: 'checked',
        event: 'change'
    },
    'text': {
        property: 'value',
        event: 'input'
    }
}


/**
 * Return property of input element to get/set its data
 *
 * @param {Element} el
 * @return {String}
 */
function inputDataProperty(el) {
    var inputType = inputElementTypes[el.type];
    return inputType
            ? inputType.property
            : inputElementTypes.byDefault.property;
}


/**
 * Returns DOM event type to listen to to react to input element change
 *
 * @param {Element} el
 * @return {String}
 */
function inputChangeEvent(el) {
    var inputType = inputElementTypes[el.type];
    return inputType
            ? inputType.event
            : inputElementTypes.byDefault.event;
}

},{"mol-proto":109}],38:[function(require,module,exports){
'use strict';

// <a name="components-dom-constructors"></a>
// ###dom events constructors


var _ = require('mol-proto');


// https://developer.mozilla.org/en-US/docs/Web/Reference/Events

var eventTypes = {
    ClipboardEvent: ['copy', 'cut', 'paste', 'beforecopy', 'beforecut', 'beforepaste'],
    Event: ['input', 'readystatechange'],
    FocusEvent: ['focus', 'blur', 'focusin', 'focusout'],
    KeyboardEvent: ['keydown', 'keypress',  'keyup'],
    MouseEvent: ['click', 'contextmenu', 'dblclick', 'mousedown', 'mouseup',
                 'mouseenter', 'mouseleave', 'mousemove', 'mouseout', 'mouseover',
                 'show' /* context menu */],
    TouchEvent: ['touchstart', 'touchend', 'touchmove', 'touchenter', 'touchleave', 'touchcancel'],
};


// mock window and event constructors for testing
if (typeof window != 'undefined')
    var global = window;
else {
    global = {};
    _.eachKey(eventTypes, function(eTypes, eventConstructorName) {
        var eventConstructor = _.makeFunction(eventConstructorName, 'type', 'properties',
            'this.type = type; _.extend(this, properties);');
        global[eventConstructorName] = eventConstructor;
    });
}


var domEventsConstructors = {};

_.eachKey(eventTypes, function(eTypes, eventConstructorName) {
    eTypes.forEach(function(type) {
        if (Object.hasOwnProperty(domEventsConstructors, type))
            throw new Error('duplicate event type ' + type);

        domEventsConstructors[type] = global[eventConstructorName];
    });
});


module.exports = domEventsConstructors;

},{"mol-proto":109}],39:[function(require,module,exports){
'use strict';

// <a name="components-source-dom"></a>
// ###component dom events source

var MessageSource = require('../../messenger/m_source')
    , Component = require('../c_class')
    , domEventsConstructors = require('./de_constrs') // TODO merge with DOMEventSource ??
    , _ = require('mol-proto')
    , check = require('../../util/check')
    , Match = check.Match;

var DOMEventsSource = _.createSubclass(MessageSource, 'DOMMessageSource', true);


_.extendProto(DOMEventsSource, {
    // implementing MessageSource interface
    init: init,
    destroy: DOMEventsSource$destroy,
    addSourceSubscriber: _.partial(sourceSubscriberMethod, 'addEventListener'),
    removeSourceSubscriber: _.partial(sourceSubscriberMethod, 'removeEventListener'),
    postMessage: DOMEventsSource$postMessage,
    trigger: trigger,

    // class specific methods
    dom: dom,
    handleEvent: handleEvent,  // event dispatcher - as defined by Event DOM API
});

module.exports = DOMEventsSource;


var useCapturePattern = /__capture$/
    , useCapturePostfix = '__capture';


// init DOM event source
function init(hostObject, proxyMethods, messengerAPIOrClass, component) {
    check(component, Component);
    this.component = component;
    MessageSource.prototype.init.apply(this, arguments);
}


function DOMEventsSource$destroy() {
    MessageSource.prototype.destroy.apply(this, arguments);
    delete this.component;
}


// get DOM element of component
function dom() {
    return this.component.el;
}


function sourceSubscriberMethod(method, eventType) {
    if (! (eventType && typeof eventType == 'string')) return;
    var capture = useCapturePattern.test(eventType);
    eventType = eventType.replace(useCapturePattern, '');
    this.dom()[method](eventType, this, capture);
}


// event dispatcher - as defined by Event DOM API
function handleEvent(event) {
    var isCapturePhase;
    if (typeof window != 'undefined')
        isCapturePhase = event.eventPhase == window.Event.CAPTURING_PHASE;

    if (isCapturePhase)
        event += useCapturePostfix;

    this.dispatchMessage(event.type, event);
}


function DOMEventsSource$postMessage(message, data) {
    this.messenger.postMessageSync(message, data);
}


function trigger(eventType, properties) {
    check(eventType, String);
    check(properties, Match.Optional(Object));

    eventType = eventType.replace(useCapturePattern, '');
    var EventConstructor = domEventsConstructors[eventType];

    if (typeof EventConstructor != 'function')
        throw new Error('unsupported event type');

    // check if it is correct
    if (typeof properties != 'undefined')
        properties.type = eventType;

    var domEvent = new EventConstructor(eventType, properties);
    var notCancelled = this.dom().dispatchEvent(domEvent);
    return notCancelled;
}

},{"../../messenger/m_source":72,"../../util/check":88,"../c_class":16,"./de_constrs":38,"mol-proto":109}],40:[function(require,module,exports){
'use strict';

// ###component iframe source

var MessageSource = require('../../messenger/m_source')
    , Component = require('../c_class')
    , _ = require('mol-proto')
    , check = require('../../util/check')
    , logger = require('../../util/logger')
    , Match = check.Match
    , FrameMessageSourceError = require('../../util/error').FrameMessageSource;

var FrameMessageSource = _.createSubclass(MessageSource, 'FrameMessageSource', true);


_.extendProto(FrameMessageSource, {
    // implementing MessageSource interface
    init: init,
    addSourceSubscriber: addSourceSubscriber,
    removeSourceSubscriber: removeSourceSubscriber,
    trigger: trigger,

    //class specific methods
    frameWindow: frameWindow,
    handleEvent: handleEvent  // event dispatcher - as defined by Event DOM API
});

module.exports = FrameMessageSource;


function init(hostObject, proxyMethods, messengerAPIOrClass, component) {
    check(component, Component);
    this.component = component;

    if (component.el.tagName.toLowerCase() != 'iframe')
        throw new FrameMessageSourceError('component for FrameMessageSource can only be attached to iframe element');

    MessageSource.prototype.init.apply(this, arguments);
}


function frameWindow() {
    return this.component.el.contentWindow;
}


// addIFrameMessageListener
function addSourceSubscriber(sourceMessage) {
    var win = this.frameWindow();
    if (win) win.addEventListener('message', this, false);
    else logger.warn('FrameMessageSource: frame window is undefined');
}


// removeIFrameMessageListener
function removeSourceSubscriber(sourceMessage) {
    var win = this.frameWindow();
    if (win) win.removeEventListener('message', this, false);
    else logger.warn('FrameMessageSource: frame window is undefined');
}


function trigger(msgType, data) {
    data = data || {};
    data.type = msgType;

    this.frameWindow().postMessage(data, '*');
}


// TODO maybe refactor to FrameMsgAPI?
function handleEvent(event) {
    this.dispatchMessage(event.data.type, event);
}

},{"../../messenger/m_source":72,"../../util/check":88,"../../util/error":94,"../../util/logger":98,"../c_class":16,"mol-proto":109}],41:[function(require,module,exports){
'use strict';

var _ = require('mol-proto')
    , componentName = require('../util/component_name')
    , check = require('../util/check')
    , Match = check.Match
    , ScopeError = require('../util/error').Scope
    , logger = require('../util/logger');


/**
 * Scope class.
 * @param {Element} rootEl the root element of this scope
 * @param {Object} hostObject the host 
 * @return {Scope}
 */
function Scope(rootEl, hostObject) {
    _.defineProperties(this, {
        _rootEl: rootEl,
        _hostObject: hostObject
    }, _.WRIT); // writable
};

_.extendProto(Scope, {
    _add: Scope$_add,
    _safeAdd: Scope$_safeAdd,
    _copy: Scope$_copy,
    _each: Scope$_each,
    _move: Scope$_move,
    _merge: Scope$_merge,
    _length: Scope$_length,
    _any: Scope$_any,
    _remove: Scope$_remove,
    _clean: Scope$_clean,
    _detachElement: Scope$_detachElement,
    _has: Scope$_has,
    _filter: Scope$_filter
});

module.exports = Scope;


var allowedNamePattern = /^[A-Za-z][A-Za-z0-9\_\$]*$/;


/**
 * Scope instance method.
 * Adds object to the scope, throwing if name is not unique
 * @param {Component|ComponentInfo} object component or component info to add to the scope
 * @param {String} name the name of the component to add
 */
function Scope$_add(object, name) {
    if (typeof name == 'string')
        object.name = name;
    else
        name = object.name;
    
    if (this.hasOwnProperty(name))
        throw new ScopeError('duplicate object name: ' + name);

    checkName(name);
    __add.call(this, object, name);
}


/**
 * Scope instance method
 * Adds object to scope renaming it if name is not unique
 * @param {Component|ComponentInfo} object component or component info to add to the scope
 * @param {String} name the name of the component to add
 */
function Scope$_safeAdd(object, name) {
    if (typeof name == 'string')
        object.name = name;
    else
        name = object.name;

    var shouldRename = this.hasOwnProperty(name);
    if (shouldRename)
        logger.error('Scope: duplicate object name: ' + name);
    else {
        shouldRename = ! allowedNamePattern.test(name);
        if (shouldRename)
            logger.error('Scope: name should start from letter, this name is not allowed: ' + name);
    }

    if (shouldRename) {
        name = componentName();
        object.name = name;
    }

    __add.call(this, object, name);
}


function __add(object, name) {
    this[name] = object;
    object.scope = this;

    if (typeof object.postMessage === 'function')
        object.postMessage('addedtoscope'); 
}


/**
 * Instance method.
 * copies all objects from one scope to another,
 * throwing if some object is not unique
 * @param {Scope} aScope the scope to copy
 */
function Scope$_copy(aScope) {
    check(aScope, Scope);

    aScope._each(Scope$_add, this);
}


/**
 * Instance method.
 * Moves a component from this scope to another scope.
 * @param {Component} component the component to be moved
 * @param {Scope} otherScope the scope to copy the component to
 */
function Scope$_move(component, otherScope) {
    otherScope._add(component);
    this._remove(component.name);
    component.scope = otherScope;
}


/**
 * Instance method.
 * Merges one scope into this scope
 * @param {Scope} scope the scope to absorb
 */
function Scope$_merge(scope) {
    scope._each(function (comp) {
        this._add(comp, comp.name);
        scope._remove(comp.name);
    }, this);
}


/**
 * Instance method.
 * Enumerates each component in the scope
 * @param {Function} callback the function to execute for each component
 * @param {Object} thisArg the context
 */
function Scope$_each(callback, thisArg) {
    _.eachKey(this, callback, thisArg || this, true); // enumerates enumerable properties only
}


/**
 * Instance method.
 * Returns a filtered list of components based on a callback
 * @param {Function} callback the function to execute for each component
 * @param {Object} thisArg the context
 * @return {Array}
 */
function Scope$_filter(callback, thisArg) {
    return _.filterKeys(this, callback, thisArg || this, true);
}


/**
 * Checks the validity of a name.
 * @param {Function} callback the function to execute for each component
 */
function checkName(name) {
    if (! allowedNamePattern.test(name))
        throw new ScopeError('name should start from letter, this name is not allowed: ' + name);
}


/**
 * Instance method.
 * Returns the number of objects in the scope
 * @return {Number}
 */
function Scope$_length() {
    return Object.keys(this).length;
}


/**
 * Instance method.
 * Returns a component from the scope. It may look like it returns the first component
 * but in reality given that scopes are hashes, there is no such thing.
 * @return {Component}
 */
function Scope$_any() {
    var key = Object.keys(this)[0];
    return key && this[key];
}


/**
 * Instance method.
 * Removes a component from the scope by it's name.
 * @param {String} name the name of the component to remove
 */
function Scope$_remove(name) {
    if (! (name in this))
        return logger.warn('removing object that is not in scope');

    var object = this[name];

    delete this[name];

    if (typeof object.postMessage === 'function')
        object.postMessage('removedfromscope');
}


/**
 * Instance method.
 * Removes all components from the scope.
 */
function Scope$_clean() {
    this._each(function(object, name) {
        delete this[name].scope;
        delete this[name];
    }, this);
}

function Scope$_detachElement() {
    this._rootEl = null;
}


/**
 * Checks if scope has object by object name
 * @param {Object} object
 * @return {Boolean}
 */
function Scope$_has(object) {
    return this.hasOwnProperty(object.name);
}

},{"../util/check":88,"../util/component_name":89,"../util/error":94,"../util/logger":98,"mol-proto":109}],42:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry');


var MLButton = Component.createComponentClass('MLButton', {
    events: undefined,
    dom: {
        cls: 'ml-ui-button'
    }
});

componentsRegistry.add(MLButton);

module.exports = MLButton;

},{"../c_class":16,"../c_registry":33}],43:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto');


var COMBO_CHANGE_MESSAGE = 'mlcombochange';

var DATALIST_TEMPLATE = '{{~ it.comboOptions :option }} \
                            <option value="{{= option.label }}"></option> \
                         {{~}}';

var MLCombo = Component.createComponentClass('MLCombo', {
    events: undefined,
    data: {
        get: MLCombo_get,
        set: MLCombo_set,
        del: MLCombo_del,
        splice: undefined,
        event: COMBO_CHANGE_MESSAGE
    },
    model: {
        messages: {
            '***': { subscriber: onOptionsChange, context: 'owner' }
        }
    },
    dom: {
        cls: 'ml-ui-datalist'
    },
    container: undefined
});

componentsRegistry.add(MLCombo);

module.exports = MLCombo;


_.extendProto(MLCombo, {
    init: MLCombo$init
});


function MLCombo$init() {
    Component.prototype.init.apply(this, arguments);
    this.on('childrenbound', onChildrenBound);
}

function onChildrenBound() {
    _.defineProperties(this, {
        '_comboInput': this.container.scope.input,
        '_comboList': this.container.scope.datalist
    });

    this._comboList.template.set(DATALIST_TEMPLATE);

    this._comboInput.data.on('input',
        { subscriber: dispatchChangeMessage, context: this });
}

function MLCombo_get() {
    if (! this._comboInput) return;
    return this._comboInput.data.get();
}

function MLCombo_set(value) {
    return changeComboData.call(this, 'set', value);
}

function MLCombo_del() {
    return changeComboData.call(this, 'del', value);
}

function changeComboData(method, value) {
    if (! this._comboInput) return;
    var result = this._comboInput.data[method](value);
    dispatchChangeMessage.call(this);
    return result;
}


// Post the data change
function dispatchChangeMessage() {
    this.data.dispatchSourceMessage(COMBO_CHANGE_MESSAGE);
}

function onOptionsChange(msg, data) {
    this._comboList.template.render({
        comboOptions: this.model.get()
    });
}

},{"../c_class":16,"../c_registry":33,"mol-proto":109}],44:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto');

var COMBO_LIST_CHANGE_MESSAGE = 'mlcombolistchange';


var MLComboList = Component.createComponentClass('MLComboList', {
    dom: {
        cls: 'ml-ui-combo-list'
    },
    data: {
        get: MLComboList_get,
        set: MLComboList_set,
        del: MLComboList_del,
        event: COMBO_LIST_CHANGE_MESSAGE
    },
    events: undefined,
    container: undefined,
    model: {
        messages: {
            '***': { subscriber: onItemsChange, context: 'owner'}
        }
    },
    template: {
        template: '<div ml-bind="MLList:list">\
                       <div ml-bind="MLListItem:item" class="list-item">\
                           <span ml-bind="[data]:label"></span>\
                           <span ml-bind="[events]:deleteBtn" class="glyphicon glyphicon-remove"></span>\
                       </div>\
                   </div>\
                   <div ml-bind="MLSuperCombo:combo"></div>'
    }
});


componentsRegistry.add(MLComboList);

module.exports = MLComboList;


_.extendProto(MLComboList, {
    init: MLComboList$init,
    setOptions: MLComboList$setOptions,
    setDataValidation: MLComboList$setDataValidation,
    toggleAddButton: MLComboList$toggleAddButton,
    destroy: MLComboList$destroy,
    setAddItemPrompt: MLComboList$setAddItemPrompt,
    clearComboInput : MLComboList$clearComboInput
});


function MLComboList$init() {
    Component.prototype.init.apply(this, arguments);
    this._dataValidation = function () {};
    this.model.set([]);
    this.once('childrenbound', onChildrenBound);
}


function MLComboList$setDataValidation(dataValidation) {
    if (typeof dataValidation == 'function')
        this._dataValidation = dataValidation;
}

function MLComboList$setOptions(arr) {
    this._combo.setOptions(arr);
}


function MLComboList$clearComboInput () {
    this._combo.clearComboInput();
}

/**
 * Component instance method
 * Hides add button
 * @param {Boolean} show
 */
function MLComboList$toggleAddButton(show) {
    this._combo.toggleAddButton(show);
}


function MLComboList$setAddItemPrompt(prompt) {
   this._combo.setAddItemPrompt(prompt);
}


function MLComboList$destroy() {
    Component.prototype.destroy.apply(this, arguments);
    this._connector && milo.minder.destroyConnector(this._connector);
    this._connector = null;
}


function onChildrenBound() {
    this.template.render().binder();
    componentSetup.call(this);
}

function componentSetup() {
    _.defineProperties(this, {
        '_combo': this.container.scope.combo,
        '_list': this.container.scope.list
    });

    this._connector = milo.minder(this._list.model, '<<<->>>', this.model);
    this._combo.data.on('', { subscriber: onComboChange, context: this });
    this._combo.on('additem', { subscriber: onAddItem, context: this });
}

function onComboChange(msg, data) {
    if (data.newValue && this._dataValidation(msg, data, this._list.model.get()))
        this._list.model.push(data.newValue);
    this._combo.data.del();
    // because of supercombo listeners off you have to set _value explicitly
    this._combo.data._value = '';
}

function onItemsChange(msg, data) {
    this.data.dispatchSourceMessage(COMBO_LIST_CHANGE_MESSAGE);
}

function MLComboList_get() {
    var value = this.model.get();
    return typeof value == 'object' ? _.clone(value) : value;
}

function MLComboList_set(value) {
    this.model.set(value);
}

function MLComboList_del() {
    return this.model.set([]);
}


function onAddItem(msg, data) {
    this.postMessage('additem', data);
    this.events.postMessage('milo_combolistadditem', data);
}

},{"../c_class":16,"../c_registry":33,"mol-proto":109}],45:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto');


var MLDate = Component.createComponentClass('MLDate', {
    events: undefined,
    data: {
        get: MLDate_get,
        set: MLDate_set,
        del: MLDate_del,
    },
    dom: {
        cls: 'ml-ui-date'
    }
});

componentsRegistry.add(MLDate);

module.exports = MLDate;


function MLDate_get() {
    var dateStr = this.el.value;

    return _.toDate(dateStr);
}


function MLDate_set(value) {   
    var date = _.toDate(value);
    if (! date) {
        this.el.value = '';
        return;
    }

    var dateArr = [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate())
    ];
    var dateStr = dateArr.join('-');
    this.el.value = dateStr;
    return dateStr;
                        
    function pad(n) {return n < 10 ? '0' + n : n; }
}


function MLDate_del() {
    this.el.value = '';
}

},{"../c_class":16,"../c_registry":33,"mol-proto":109}],46:[function(require,module,exports){
'use strict';


var Component = require('../c_class')
    , componentsRegistry = require('../c_registry');


var MLDropTarget = Component.createComponentClass('MLDropTarget', ['drop']);


componentsRegistry.add(MLDropTarget);

module.exports = MLDropTarget;

},{"../c_class":16,"../c_registry":33}],47:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry');


var MLGroup = Component.createComponentClass('MLGroup', {
    container: undefined,
    data: undefined,
    events: undefined,
    dom: {
        cls: 'ml-ui-group'
    }
});

componentsRegistry.add(MLGroup);

module.exports = MLGroup;

},{"../c_class":16,"../c_registry":33}],48:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry');


var MLHyperlink = Component.createComponentClass('MLHyperlink', {
    events: undefined,
    data: undefined,
    dom: {
        cls: 'ml-ui-hyperlink'
    }
});

componentsRegistry.add(MLHyperlink);

module.exports = MLHyperlink;

},{"../c_class":16,"../c_registry":33}],49:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto');


var IMAGE_CHANGE_MESSAGE = 'mlimagechange';

var MLImage = Component.createComponentClass('MLImage', {
    data: {
        set: MLImage_set,
        get: MLImage_get,
        del: MLImage_del,
        splice: undefined,
        event: IMAGE_CHANGE_MESSAGE
    },
    model: {
        messages: {
            '**': { subscriber: onModelChange, context: 'owner' }
        }
    },
    events: undefined,
    container: undefined,
    dom: {
        tagName: 'img',
        cls: 'ml-ui-image'
    }
});

componentsRegistry.add(MLImage);

module.exports = MLImage;


_.extendProto(MLImage, {
    init: MLImage$init
});


/**
 * Component instance method
 * Initialize radio group and setup
 */
function MLImage$init() {
    Component.prototype.init.apply(this, arguments);
}


/**
 * Sets image value
 * Replaces the data set operation to deal with radio buttons
 *
 * @param {Mixed} value The value to be set
 */
function MLImage_set(value) {
    this.model.set(value);
    return value;
}


/**
 * Gets group value
 * Retrieves the selected value of the group
 *
 * @return {String}
 */
function MLImage_get() {
    var value = this.model.get();
    return typeof value == 'object' ? _.clone(value) : value;
}


/**
 * Deleted group value
 * Deletes the value of the group, setting it to empty
 */
function MLImage_del() {
    this.model.del();
}


// Post the data change
function dispatchChangeMessage() {
    this.data.dispatchSourceMessage(IMAGE_CHANGE_MESSAGE);
}


function onModelChange(path, data) {
    var src = this.model.m('.src').get();
    if (src) this.el.src = src;
    dispatchChangeMessage.call(this);
}

},{"../c_class":16,"../c_registry":33,"mol-proto":109}],50:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto');


var MLInput = Component.createComponentClass('MLInput', {
    data: undefined,
    events: undefined,
    dom: {
        cls: 'ml-ui-input'
    }
});

componentsRegistry.add(MLInput);

module.exports = MLInput;

_.extendProto(MLInput, {
    disable: MLInput$disable
});


function MLInput$disable(disable) {
    this.el.disabled = disable;
}
},{"../c_class":16,"../c_registry":33,"mol-proto":109}],51:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto');

var INPUT_LIST_CHANGE_MESSAGE = 'mlinputlistchange';

var asyncHandler = function (value, callback) {callback(value);};

var MLInputList = Component.createComponentClass('MLInputList', {
    dom: {
        cls: 'ml-ui-input-list'
    },
    data: {
        get: MLInputList_get,
        set: MLInputList_set,
        del: MLInputList_del,
        splice: MLInputList_splice,
        event: INPUT_LIST_CHANGE_MESSAGE
    },
    events: undefined,
    container: undefined,
    model: {
        messages: {
            '***': { subscriber: onItemsChange, context: 'owner' }
        }
    },
    template: {
        template: '\
            <div ml-bind="MLList:list">\
                <div ml-bind="MLListItem:item" class="list-item">\
                    <span ml-bind="[data]:label"></span>\
                    <span ml-bind="[events]:deleteBtn" class="glyphicon glyphicon-remove"></span>\
                </div>\
            </div>\
            <input type="text" ml-bind="MLInput:input" class="form-control">\
            <button ml-bind="MLButton:button" class="btn btn-default">\
                Add\
            </button>'
    }
});

componentsRegistry.add(MLInputList);

module.exports = MLInputList;

_.extendProto(MLInputList, {
    init: MLInputList$init,
    setAsync: MLInputList$setAsync,
    setPlaceHolder: MLInputList$setPlaceHolder,
    destroy: MLInputList$destroy
});

function MLInputList$init() {
    Component.prototype.init.apply(this, arguments);
    this.once('childrenbound', onChildrenBound);
    this.model.set([]);
}

function onChildrenBound() {
    render.call(this);
}

function MLInputList$setPlaceHolder(placeHolder) {
    this._input.el.setAttribute('placeHolder', placeHolder);
}

function MLInputList$setAsync(newHandler) {
    asyncHandler = newHandler || asyncHandler;
}

function MLInputList$destroy() {
    Component.prototype.destroy.apply(this, arguments);
    this._connector && milo.minder.destroyConnector(this._connector);
    this._connector = null;
}

function render() {
    this.template.render().binder();
    componentSetup.call(this);
}

function componentSetup() {
    _.defineProperties(this, {
        '_input': this.container.scope.input,
        '_button': this.container.scope.button,
        '_list': this.container.scope.list
    });
    this._connector = milo.minder(this._list.model, '<<<->>>', this.model);
    this._button.events.on('click', {subscriber: onClick, context: this });   
}

function onClick(msg) {
    var value = this._input.data.get(0);
    if (this._input.data)
        asyncHandler(value, function (label, value) {
            this._list.model.push({ label: label, value: value });
        }.bind(this));
    this._input.data.del();
}

function onItemsChange(msg, data) {
    this.data.dispatchSourceMessage(INPUT_LIST_CHANGE_MESSAGE);
}

function MLInputList_get() {
    var model = this.model.get();
    return model ? _.clone(model) : undefined;
}

function MLInputList_set(value) {
    this.model.set(value);
}

function MLInputList_del() {
    return this.model.set([]);
}

function MLInputList_splice() { // ... arguments
    this.model.splice.apply(this.model, arguments);
}
},{"../c_class":16,"../c_registry":33,"mol-proto":109}],52:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto');

var LIST_CHANGE_MESSAGE = 'mllistchange'
    , DELETE_BUTTON_NAME = 'deleteBtn';


var MLList = Component.createComponentClass('MLList', {
    dom: {
        cls: 'ml-ui-list'
    },
    data: undefined,
    events: undefined,
    model: undefined,
    list: undefined
});


componentsRegistry.add(MLList);

module.exports = MLList;


_.extendProto(MLList, {
    init: MLList$init,
    destroy: MLList$destroy
});


function MLList$init() {
    Component.prototype.init.apply(this, arguments);
    this.on('childrenbound', onChildrenBound);
}


function MLList$destroy() {
    Component.prototype.destroy.apply(this, arguments);
    this._connector && milo.minder.destroyConnector(this._connector);
    this._connector = null;
}


function onChildrenBound() {
    this.model.set([]);
    this._connector = milo.minder(this.model, '<<<->>>', this.data);
}

},{"../c_class":16,"../c_registry":33,"mol-proto":109}],53:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto');


var LISTITEM_CHANGE_MESSAGE = 'mllistitemchange'

var MLListItem = Component.createComponentClass('MLListItem', {
    container: undefined,
    dom: undefined,
    data: {
        get: MLListItem_get,
        set: MLListItem_set,
        del: MLListItem_del,
        event: LISTITEM_CHANGE_MESSAGE
    },
    model: undefined,
    item: undefined
});

componentsRegistry.add(MLListItem);

module.exports = MLListItem;


_.extendProto(MLListItem, {
    init: MLListItem$init
});


function MLListItem$init() {
    Component.prototype.init.apply(this, arguments);
    this.on('childrenbound', onChildrenBound);
}


function MLListItem_get() {
    var value = this.model.get();
    return typeof value == 'object' ? _.clone(value) : value;
}


function MLListItem_set(value) {
    if (typeof value == 'object')
        this.data._set(value);
    this.model.set(value);
    _sendChangeMessage.call(this);
    return value;
}


function MLListItem_del() {
    this.data._del();
    this.model.del();
    _sendChangeMessage.call(this);    
}


function _sendChangeMessage() {
    this.data.dispatchSourceMessage(LISTITEM_CHANGE_MESSAGE);
}


function onChildrenBound() {
    var deleteBtn = this.container.scope.deleteBtn;
    deleteBtn.events.on('click', { subscriber: deleteItem, context: this });
}


function deleteItem() {
    var itemFacet = this.item
        , listComp = itemFacet.list.owner;
    
    listComp.data.splice(itemFacet.index, 1);
}
},{"../c_class":16,"../c_registry":33,"mol-proto":109}],54:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , miloCount = require('../../util/count')
    , _ = require('mol-proto');


var RADIO_CHANGE_MESSAGE = 'mlradiogroupchange'
    , ELEMENT_NAME_PROPERTY = '_mlRadioGroupElementID'
    , ELEMENT_NAME_PREFIX = 'ml-radio-group-'

var MLRadioGroup = Component.createComponentClass('MLRadioGroup', {
    data: {
        set: MLRadioGroup_set,
        get: MLRadioGroup_get,
        del: MLRadioGroup_del,
        splice: undefined,
        event: RADIO_CHANGE_MESSAGE
    },
    model: {
        messages: {
            '***': { subscriber: onOptionsChange, context: 'owner' }
        }
    },
    events: {
        messages: {
            'click': { subscriber: onGroupClick, context: 'owner' }
        }
    },
    container: undefined,
    dom: {
        cls: 'ml-ui-radio-group'
    },
    template: {
        template: '{{~ it.radioOptions :option }} \
                        {{##def.elID:{{= it.elementName }}-{{= option.value }}#}} \
                        <span class="'+ELEMENT_NAME_PREFIX+'option"> \
                            <input id="{{# def.elID }}" type="radio" value="{{= option.value }}" name="{{= it.elementName }}"> \
                            <label for="{{# def.elID }}">{{= option.label }}</label> \
                        </span> \
                   {{~}}'
    }
});

componentsRegistry.add(MLRadioGroup);

module.exports = MLRadioGroup;


_.extendProto(MLRadioGroup, {
    init: MLRadioGroup$init
});


/**
 * Component instance method
 * Initialize radio group and setup 
 */
function MLRadioGroup$init() {
    _.defineProperty(this, '_radioList', [], _.CONF);
    _.defineProperty(this, ELEMENT_NAME_PROPERTY, ELEMENT_NAME_PREFIX + miloCount());
    Component.prototype.init.apply(this, arguments);
}


/**
 * Sets group value
 * Replaces the data set operation to deal with radio buttons
 *
 * @param {Mixed} value The value to be set
 */
function MLRadioGroup_set(value) {
    var options = this._radioList
        , setResult;
    if (options.length) {
        options.forEach(function(radio) {
            radio.checked = radio.value == value;
            if (radio.checked)
                setResult = value;
        });

        dispatchChangeMessage.call(this);

        return setResult;
    }
}


/**
 * Gets group value
 * Retrieves the selected value of the group
 *
 * @return {String}
 */
function MLRadioGroup_get() {
    var checked = _.find(this._radioList, function(radio) {
        return radio.checked;
    }); 

    return checked && checked.value || undefined;
}


/**
 * Deleted group value
 * Deletes the value of the group, setting it to empty
 */
function MLRadioGroup_del() {
    var options = this._radioList;
    if (options.length)
        options.forEach(function(radio) {
            radio.checked = false;
        });

    dispatchChangeMessage.call(this);
    return undefined;
}


/**
 * Manage radio children clicks
 */
function onGroupClick(eventType, event) {
    if (event.target.type == 'radio')
        dispatchChangeMessage.call(this);
}

// Post the data change
function dispatchChangeMessage() {
    this.data.dispatchSourceMessage(RADIO_CHANGE_MESSAGE);
}


// Set radio button children on model change
function onOptionsChange(path, data) {
    this.template.render({
        radioOptions: this.model.get(),
        elementName: this[ELEMENT_NAME_PROPERTY]
    });

    var radioEls = this.el.querySelectorAll('input[type="radio"]')
        , options = this._radioList;
    options.length = 0;
    _.forEach(radioEls, options.push, options);
}

},{"../../util/count":90,"../c_class":16,"../c_registry":33,"mol-proto":109}],55:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto');


var MLSelect = Component.createComponentClass('MLSelect', {
    dom: {
        cls: 'ml-ui-select'
    },
    data: undefined,
    events: undefined,
    model: {
        messages: {
            '***': { subscriber: onOptionsChange, context: 'owner' }
        }
    },
    template: {
        template: '{{~ it.selectOptions :option }} \
                        <option value="{{= option.value }}">{{= option.label }}</option> \
                   {{~}}'
    }
});


componentsRegistry.add(MLSelect);

module.exports = MLSelect;


_.extendProto(MLSelect, {
    disable: MLSelect$disable
});


function MLSelect$disable(disable) {
    this.el.disabled = disable;
}


function onOptionsChange(path, data) {
    this.template.render({ selectOptions: this.model.get() });
}

},{"../c_class":16,"../c_registry":33,"mol-proto":109}],56:[function(require,module,exports){
'use strict';

/**
 * MLSuperCombo
 * A combo select list with intelligent scrolling of super large lists.
 */

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto')
    , doT = require('dot')
    , logger = require('../../util/logger');

var COMBO_OPEN = 'ml-ui-supercombo-open';
var COMBO_CHANGE_MESSAGE = 'mlsupercombochange';

var OPTIONS_TEMPLATE = '{{~ it.comboOptions :option:index }}\
                            <div {{? option.selected}}class="selected" {{?}}data-value="{{= index }}">{{= option.label }}</div>\
                        {{~}}';

var MAX_RENDERED = 100;
var BUFFER = 25;
var DEFAULT_ELEMENT_HEIGHT = 20;

var MLSuperCombo = Component.createComponentClass('MLSuperCombo', {
    events: {
        messages: {
            'mouseleave': {subscriber: onMouseLeave, context: 'owner'}
        }
    },
    data: {
        get: MLSuperCombo_get,
        set: MLSuperCombo_set,
        del: MLSuperCombo_del,
        splice: undefined,
        event: COMBO_CHANGE_MESSAGE
    },
    dom: {
        cls: 'ml-ui-supercombo'
    },
    template: {
        template: '<input ml-bind="[data, events]:input" class="form-control ml-ui-input">\
                   <div ml-bind="[dom]:addItemDiv">\
                        <span ml-bind=":addPrompt"></span>\
                        <button ml-bind="[events, dom]:addBtn" class="btn btn-default ml-ui-button">Add</button>\
                   </div>\
                   <div ml-bind="[dom, events]:list" class="ml-ui-supercombo-dropdown">\
                       <div ml-bind="[dom]:before"></div>\
                       <div ml-bind="[template, dom, events]:options" class="ml-ui-supercombo-options"></div>\
                       <div ml-bind="[dom]:after"></div>\
                   </div>'
    },
    container: undefined
});

componentsRegistry.add(MLSuperCombo);

module.exports = MLSuperCombo;

/**
 * Public Api
 */
_.extendProto(MLSuperCombo, {
    init: MLSuperCombo$init,
    showOptions: MLSuperCombo$showOptions,
    hideOptions: MLSuperCombo$hideOptions,
    toggleOptions: MLSuperCombo$toggleOptions,
    setOptions: MLSuperCombo$setOptions,
    setFilteredOptions: MLSuperCombo$setFilteredOptions,
    update: MLSuperCombo$update,
    toggleAddButton: MLSuperCombo$toggleAddButton,
    setAddItemPrompt: MLSuperCombo$setAddItemPrompt,
    clearComboInput: MLSuperCombo_del
});


/**
 * Component instance method
 * Initialise the component, wait for childrenbound, setup empty options arrays.
 */
function MLSuperCombo$init() {
    Component.prototype.init.apply(this, arguments);

    this.once('childrenbound', onChildrenBound);

    _.defineProperties(this, {
        _optionsData: [],
        _filteredOptionsData: []
    }, _.WRIT);
}

/**
 * Handler for init childrenbound listener. Renders template.
 */
function onChildrenBound() {
    this.template.render().binder();
    componentSetup.call(this);
}


/**
 * Define instance properties, get subcomponents, call setup sub-tasks
 */
function componentSetup() {
    var scope = this.container.scope;

    _.defineProperties(this, {
        _comboInput: scope.input,
        _comboList: scope.list,
        _comboOptions: scope.options,
        _comboBefore: scope.before,
        _comboAfter: scope.after,
        _comboAddItemDiv: scope.addItemDiv,
        _comboAddPrompt: scope.addPrompt,
        _comboAddBtn: scope.addBtn,
        _optionTemplate: doT.compile(OPTIONS_TEMPLATE)
    });

    _.defineProperties(this, {
        _startIndex: 0,
        _endIndex: MAX_RENDERED,
        _hidden: false,
        _elementHeight: DEFAULT_ELEMENT_HEIGHT,
        _total: 0,
        _optionsHeight: 200,
        _lastScrollPos: 0,
        _currentValue: null,
        _selected: null
    }, _.WRIT);

    // Component Setup
    this.dom.setStyles({ position: 'relative' });
    setupComboList(this._comboList, this._comboOptions, this);
    setupComboInput(this._comboInput, this);
    setupComboBtn(this._comboAddBtn, this);

    this.events.on('keydown', { subscriber: changeSelected, context: this });
    //this.events.on('mouseleave', { subscriber: MLSuperCombo$hideOptions, context: this });
}

/**
 * Component instance method
 * Shows or hides option list.
 *
 * @param {Boolean} show true to show, false to hide
 */
function MLSuperCombo$toggleOptions(show) {
    this._hidden = !show;
    this._comboList.dom.toggle(show);
}

/**
 * Component instance method
 * Shows options list
 */
function MLSuperCombo$showOptions() {
    this._hidden = false;
    this.el.classList.add(COMBO_OPEN);
    this._comboList.dom.toggle(true);
}

/**
 * Component instance method
 * Hides options list
 */
function MLSuperCombo$hideOptions() {
    this._hidden = true;
    this.el.classList.remove(COMBO_OPEN);
    this._comboList.dom.toggle(false);
}

/**
 * Component instance method
 * Hides add button
 */
function MLSuperCombo$toggleAddButton(show) {
    this._comboAddItemDiv.dom.toggle(show);
    this.hideOptions();
}


function MLSuperCombo$setAddItemPrompt(prompt) {
    this._addItemPrompt = prompt;
    this._comboAddPrompt.el.innerHTML = prompt;
    this.toggleAddButton(false);
}


/**
 * Component instance method
 * Sets the options of the dropdown
 *
 * @param {Array[Object]} arr the options to set with label and value pairs. Value can be an object.
 */
function MLSuperCombo$setOptions(arr) {
    this._optionsData = arr;
    this.setFilteredOptions(arr);
}

/**
 * Component instance method
 * Sets the filtered options, which is a subset of normal options
 *
 * @param {[type]} arr The options to set
 */
function MLSuperCombo$setFilteredOptions(arr) {
    if (! arr) return logger.error('setFilteredOptions: parameter is undefined');
    this._filteredOptionsData = arr;
    this._total = arr.length;
    this.update();
}

/**
 * Component instance method
 * Updates the list. This is used on scroll, and makes use of the filteredOptions to
 * intelligently show a subset of the filtered list at a time.
 */
function MLSuperCombo$update() {
    var wasHidden = this._hidden;

    var arrToShow = this._filteredOptionsData.slice(this._startIndex, this._endIndex);

    this._comboOptions.template.render({
        comboOptions: arrToShow
    });

    this._elementHeight = this._elementHeight || DEFAULT_ELEMENT_HEIGHT;

    if (wasHidden)
        this.hideOptions();

    var beforeHeight = this._startIndex * this._elementHeight;
    var afterHeight = (this._total - this._endIndex) * this._elementHeight;
    this._comboBefore.el.style.height = beforeHeight + 'px';
    this._comboAfter.el.style.height = afterHeight > 0 ? afterHeight + 'px' : '0px';
}

/**
 * Setup the combo list
 *
 * @param  {Component} list
 * @param  {Array} options
 * @param  {Component} self
 */
function setupComboList(list, options, self) {
    self.toggleAddButton(false);
    options.template.set(OPTIONS_TEMPLATE);

    list.dom.setStyles({
        overflow: 'scroll',
        height: self._optionsHeight + 'px',
        width: '100%',
        position: 'absolute',
        zIndex: 10
        // top: yPos + 'px',
        // left: xPos + 'px',
    });

    self.hideOptions();
    list.events.onMessages({
        'click': {subscriber: onListClick, context: self},
        'scroll': {subscriber: onListScroll, context: self}
    });
}

/**
 * Setup the input component
 *
 * @param  {Component} input
 * @param  {Component} self
 */
function setupComboInput(input, self) {
    input.data.on('', { subscriber: onDataChange, context: self });
    input.events.on('click', {subscriber: onInputClick, context: self });
    input.events.on('keydown', {subscriber: onEnterKey, context: self });
}

/**
 * Setup the button
 * @param  {Component} btn
 * @param  {Component} self
 */
function setupComboBtn(btn, self) {
    btn.events.on('click', { subscriber: onAddBtn, context: self });
}


/**
 * Custom data facet get method
 */
function MLSuperCombo_get() {
    return this._currentValue;
}

/**
 * Custom data facet set method
 * @param {Variable} obj
 */
function MLSuperCombo_set(obj) {
    this._currentValue = obj;
    this._comboInput.data.set(obj && obj.label);
    _.deferMethod(this, 'hideOptions');
}

/**
 * Custom data facet del method
 */
function MLSuperCombo_del() {
    this._currentValue = null;
    this._comboInput.data.set('');
}


/**
 * Input data change handler
 * When the input data changes, this method filters the optionsData, and sets the first element
 * to be selected.
 * @param  {String} msg
 * @param  {Objext} data
 */
function onDataChange(msg, data) {
    var text = data.newValue && data.newValue.trim().toLowerCase();
    var filteredArr = _.filter(this._optionsData, function(option) {
        delete option.selected;
        if (option.label) {
            var label = option.label.toLowerCase();
            return label.indexOf(text) == 0;
        }
    });

    if (filteredArr.length) {
        this.toggleAddButton(false);
        this.showOptions();
        filteredArr[0].selected = true;
        this._selected = filteredArr[0];
    } else if (this._addItemPrompt) {
        this.toggleAddButton(this._optionsData.length > 1);
        this.hideOptions();
    }

    this.setFilteredOptions(filteredArr);
    this._comboList.el.scrollTop = 0;
}

/**
 * A map of keyCodes to directions
 * @type {Object}
 */
var directionMap = { '40': 1, '38': -1 };

/**
 * List keydown handler
 * Changes the selected list item by finding the adjacent item and setting it to selected.
 *
 * @param  {string} type
 * @param  {Event} event
 */
function changeSelected(type, event) {
    // TODO: refactor and tidy up, looks like some code duplication.
    var direction = directionMap[event.keyCode];

    if (direction) {
        var selected = this.el.querySelectorAll('.selected')[0]
            , scrollPos = this._comboList.el.scrollTop
            , selectedPos = selected ? selected.offsetTop : 0
            , relativePos = selectedPos - scrollPos;

        if (selected) {
            var index = _getDataValueFromElement.call(this, selected)
                , thisItem = this._filteredOptionsData[index]
                , adjItem = this._filteredOptionsData[index + direction];

            if (adjItem) {
                delete thisItem.selected;
                adjItem.selected = true;
                this._selected = adjItem;
                this.update();
            }
        } else {
            if (this._filteredOptionsData[0]) {
                this._filteredOptionsData[0].selected = true;
                this.update();
            }
        }

        if (relativePos > this._optionsHeight - this._elementHeight*2 && direction === 1)
            this._comboList.el.scrollTop += this._elementHeight*direction*5;

        if (relativePos < this._elementHeight && direction === -1)
            this._comboList.el.scrollTop += this._elementHeight*direction*5;
    }
}

/**
 * Mouse leave handler
 *
 * @param  {String} type
 * @param  {Event} event
 */
function onMouseLeave(type, event) {
    this.hideOptions();
}


/**
 * Input click handler
 *
 * @param  {String} type
 * @param  {Event} event
 */
function onInputClick(type, event) {
    this.showOptions();
}


/**
 * Enter key handler
 *
 * @param  {String} type
 * @param  {Event} event
 */
function onEnterKey(type, event) {
    if (event.keyCode == 13) {
        if (this._selected)
            _setData.call(this);
    }
}

/**
 * Add button handler
 *
 * @param  {String} type
 * @param  {Event} event
 */
function onAddBtn (type, event) {
    var data = { label: this._comboInput.el.value };
    this.postMessage('additem', data);
    this.events.postMessage('milo_supercomboadditem', data);
    this.toggleAddButton(false);

}

/**
 * List click handler
 *
 * @param  {String} type
 * @param  {Event} event
 */
function onListClick (type, event) {
    var index = _getDataValueFromElement.call(this, event.target);
    var data = this._filteredOptionsData[index];

    this._selected = data;
    _setData.call(this);
    this.update();
}


/**
 * List scroll handler
 *
 * @param  {String} type
 * @param  {Event} event
 */
function onListScroll (type, event) {
    var scrollPos = event.target.scrollTop
        , direction = scrollPos > this._lastScrollPos ? 'down' : 'up'
        , firstChild = this._comboOptions.el.lastElementChild
        , lastChild = this._comboOptions.el.firstElementChild
        , lastElPosition = firstChild ? firstChild.offsetTop : 0
        , firstElPosition = lastChild ? lastChild.offsetTop : 0
        , distFromLastEl = lastElPosition - scrollPos - this._optionsHeight + this._elementHeight
        , distFromFirstEl = scrollPos - firstElPosition
        , elsFromStart = Math.floor(distFromFirstEl / this._elementHeight)
        , elsToTheEnd = Math.floor(distFromLastEl / this._elementHeight)
        , totalElementsBefore = Math.floor(scrollPos / this._elementHeight) - BUFFER;

    if ((direction == 'down' && elsToTheEnd < BUFFER)
        || (direction == 'up' && elsFromStart < BUFFER)) {
        this._startIndex = totalElementsBefore > 0 ? totalElementsBefore : 0;
        this._endIndex = totalElementsBefore + MAX_RENDERED;
        this._elementHeight = firstChild.style.height;
        this.update();
    }
    this._lastScrollPos = scrollPos;
}


/**
 * Private method
 * Retrieves the data-value attribute value from the element and returns it as an index of
 * the filteredOptions
 *
 * @param  {Element} el
 * @return {Number}
 */
function _getDataValueFromElement(el) {
    return Number(el.getAttribute('data-value')) + this._startIndex;
}

/**
 * Private method
 * Sets the data of the SuperCombo, taking care to reset some things and temporarily
 * unsubscribe data listeners.
 */
function _setData() {
    delete this._selected.selected;
    this.hideOptions();
    this._comboInput.data.off('', { subscriber: onDataChange, context: this });
    //supercombo listeners off
    this.data.set(this._selected);
    this.data.dispatchSourceMessage(COMBO_CHANGE_MESSAGE);
    this._comboInput.data.on('', { subscriber: onDataChange, context: this });
    //supercombo listeners on
    this._selected = null;
    this.setFilteredOptions(this._optionsData);
}

},{"../../util/logger":98,"../c_class":16,"../c_registry":33,"dot":107,"mol-proto":109}],57:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry');


var MLText = Component.createComponentClass('MLText', {
    container: undefined,
    data: undefined,
    events: undefined,
    dom: {
        cls: 'ml-ui-text'
    }
});

componentsRegistry.add(MLText);

module.exports = MLText;

},{"../c_class":16,"../c_registry":33}],58:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry')
    , _ = require('mol-proto')
    , logger = require('../../util/logger');


var MLTextarea = Component.createComponentClass('MLTextarea', {
    data: undefined,
    events: undefined,
    dom: {
        cls: 'ml-ui-textarea'
    }
});

componentsRegistry.add(MLTextarea);

module.exports = MLTextarea;


var SAMPLE_AUTORESIZE_TEXT = 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit,';


_.extendProto(MLTextarea, {
    startAutoresize: MLTextarea$startAutoresize,
    stopAutoresize: MLTextarea$stopAutoresize
});


function MLTextarea$startAutoresize(options) {
    if (this._autoresize)
        return logger.warn('MLTextarea startAutoresize: autoresize is already on');
    this._autoresize = true;
    this._autoresizeOptions = options;

    _adjustAreaHeight.call(this);
    _subscribeTextChange.call(this, 'on');
}


function _subscribeTextChange(onOff) {
    this.data[onOff]('', { subscriber: _adjustAreaHeight, context: this });
}


function _adjustAreaHeight() {
    this.el.style.height = 0;

    var newHeight = this.el.scrollHeight
        , minHeight = this._autoresizeOptions.minHeight
        , maxHeight = this._autoresizeOptions.maxHeight;

    newHeight = newHeight >= maxHeight
                ? maxHeight
                : newHeight <= minHeight
                ? minHeight
                : newHeight;

    this.el.style.height = newHeight + 'px';
}


function MLTextarea$stopAutoresize() {
    if (! this._autoresize)
        return logger.warn('MLTextarea stopAutoresize: autoresize is not on');
    this._autoresize = false;
    _subscribeTextChange.call(this, 'off');
}


function MLTextarea$destroy() {
    if (this._autoresize)
        this.stopAutoresize();
    Component.prototype.destroy.apply(this, arguments);
}

},{"../../util/logger":98,"../c_class":16,"../c_registry":33,"mol-proto":109}],59:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry');


var MLTime = Component.createComponentClass('MLTime', {
    events: undefined,
    data: {
        get: MLTime_get,
        set: MLTime_set,
        del: MLTime_del,
    },
    dom: {
        cls: 'ml-ui-time'
    }
});

componentsRegistry.add(MLTime);

module.exports = MLTime;


var TIME_REGEX = /^([0-9]{1,2})(?:\:|\.)([0-9]{1,2})$/
    , TIME_TEMPLATE = 'hh:mm';

function MLTime_get() {
    var timeStr = this.el.value;
    var match = timeStr.match(TIME_REGEX);
    if (! match) return;
    var hours = match[1]
        , mins = match[2];
    if (hours > 23 || mins > 59) return;
    var time = new Date(1970, 0, 1, hours, mins);

    return _.toDate(time);
}


function MLTime_set(value) {
    var time = _.toDate(value);
    if (! time) {
        this.el.value = '';
        return;
    }

    var timeStr = TIME_TEMPLATE
            .replace('hh', pad(time.getHours()))
            .replace('mm', pad(time.getMinutes()));

    this.el.value = timeStr;
    return timeStr;

    function pad(n) {return n < 10 ? '0' + n : n; }
}


function MLTime_del() {
    this.el.value = '';
}

},{"../c_class":16,"../c_registry":33}],60:[function(require,module,exports){
'use strict';

var Component = require('../c_class')
    , componentsRegistry = require('../c_registry');


var MLWrapper = Component.createComponentClass('MLWrapper', {
    container: undefined,
    data: undefined,
    events: undefined,
    dom: {
        cls: 'ml-ui-wrapper'
    }
});

componentsRegistry.add(MLWrapper);

module.exports = MLWrapper;

},{"../c_class":16,"../c_registry":33}],61:[function(require,module,exports){
'use strict';

var Component = require('../../c_class')
    , componentsRegistry = require('../../c_registry')
    , componentName = require('../../../util/component_name')
    , logger = require('../../../util/logger')
    , check = require('../../../util/check')
    , Match = check.Match
    , _ = require('mol-proto');


var ALERT_CSS_CLASSES = {
    success: 'alert-success',
    warning: 'alert-warning',
    info: 'alert-info',
    danger: 'alert-danger',
    fixed: 'alert-fixed'
};


var MLAlert = Component.createComponentClass('MLAlert', {
    container: undefined,
    events: undefined,
    dom: {
        cls: ['ml-bs-alert', 'alert', 'fade'],
        attributes: {
            'role': 'alert',
            'aria-hidden': 'true'
        }
    },
    template: {
        template: '\
            {{? it.close }}\
                <button ml-bind="[events]:closeBtn" type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>\
            {{?}}\
            {{= it.message}}'
    }
});

componentsRegistry.add(MLAlert);

module.exports = MLAlert;


_.extend(MLAlert, {
    createAlert: MLAlert$$createAlert,
    openAlert: MLAlert$$openAlert,
});


_.extendProto(MLAlert, {
    openAlert: MLAlert$openAlert,
    closeAlert: MLAlert$closeAlert
});


/**
 * Creates and returns a new alert instance. To create and open at the same time use [openAlert](#MLAlert$$openAlert)
 * `options` is an object with the following properties:
 *
 *      message: string alert message
 *      type:    optional string the type of alert message, one of success, warning, info, danger, fixed
 *               default 'info'
 *      close:   optional false to prevent user from closing
 *               or true (default) to enable closing and render a close button
 *      timeout: optional timer, in milliseconds to automatically close the alert
 *
 * @param {Object} options alert configuration
 */
function MLAlert$$createAlert(options) {
    check(options, {
        message: String,
        type: Match.Optional(String),
        close: Match.Optional(Boolean),
        timeout: Match.Optional(Number)
    });

    var alert = MLAlert.createOnElement();

    options = _prepareOptions(options);

    var alertCls = ALERT_CSS_CLASSES[options.type];
    alert.dom.addCssClasses(alertCls);

    alert._alert = {
        options: options,
        visible: false
    };

    alert.template.render(options).binder();

    var alertScope = alert.container.scope;

    if (options.close)
        alertScope.closeBtn.events.on('click',
            { subscriber: _onCloseBtnClick, context: alert });

    if (options.timeout)
        var timer = setTimeout(function(){
            if(alert._alert.visible)
                alert.closeAlert();
        }, options.timeout);

    return alert;
}


/**
 * Create and show alert popup
 *
 * @param {Object} options object with message, type, close and timeout
 * @return {MLAlert} the alert instance
 */
function MLAlert$$openAlert(options) {
    var alert = MLAlert.createAlert(options);
    alert.openAlert();
    return alert;
}


function _onCloseBtnClick(type, event) {
    this.closeAlert();
}


function _prepareOptions(options) {
    options = _.clone(options);
    options.close = typeof options.close == 'undefined' || options.close === true;
    options.timeout = Math.floor(options.timeout);
    options.type = options.type || 'info';

    return options;
}


/**
 * Open the alert
 */
function MLAlert$openAlert() {
    _toggleAlert.call(this, true);
}


/**
 * Close the alert
 */
function MLAlert$closeAlert() {
    _toggleAlert.call(this, false);
    this.destroy();
}


function _toggleAlert(doShow) {
    doShow = typeof doShow == 'undefined'
                ? ! this._alert.visible
                : !! doShow;

    var addRemove = doShow ? 'add' : 'remove'
        , appendRemove = doShow ? 'appendChild' : 'removeChild';

    this._alert.visible = doShow;

    document.body[appendRemove](this.el);
    this.dom.toggle(doShow);
    this.el.setAttribute('aria-hidden', !doShow);
    this.el.classList[addRemove]('in');
    this.el[doShow ? 'focus' : 'blur']();
}

},{"../../../util/check":88,"../../../util/component_name":89,"../../../util/logger":98,"../../c_class":16,"../../c_registry":33,"mol-proto":109}],62:[function(require,module,exports){
'use strict';

var Component = require('../../c_class')
    , componentsRegistry = require('../../c_registry')
    , componentName = require('../../../util/component_name')
    , logger = require('../../../util/logger')
    , check = require('../../../util/check')
    , Match = check.Match
    , _ = require('mol-proto');


var DEFAULT_BUTTONS = [ { type: 'default', label: 'OK', result: 'OK' } ];

var CLOSE_OPTIONS = ['backdrop', 'keyboard', 'button'];

var BUTTON_CSS_CLASSES = { // TODO - use in template
    defult: 'btn-defult',
    primary: 'btn-primary',
    success: 'btn-success',
    info: 'btn-info',
    warning: 'btn-warning',
    danger: 'btn-danger',
    link: 'btn-link'
}


/**
 * Dialog class to show custom dialog boxes based on configuration - see [createDialog](#MLDialog$$createDialog) method.
 * Only one dialog can be opened at a time - trying to open another will log error to console. Currently opened dialog can be retrieved using [getCurrentDialog](#MLDialog$$getCurrentDialog) class method.
 */
var MLDialog = Component.createComponentClass('MLDialog', {
    container: undefined,
    events: undefined,
    dom: {
        cls: ['ml-bs-dialog', 'modal', 'fade'],
        attributes: {
            'role': 'dialog',
            'aria-hidden': 'true'
        }
    },
    template: {
        template: '\
            <div class="modal-dialog">\
                <div class="modal-content">\
                    {{? it.title }}\
                        <div class="modal-header">\
                            {{? it.close.button }}\
                                <button ml-bind="[events]:closeBtn" type="button" class="close">&times;</button>\
                            {{?}}\
                            <h4 class="modal-title">{{= it.title }}</h4>\
                        </div>\
                    {{?}}\
                    {{? it.html || it.text }}\
                        <div class="modal-body">\
                            {{? it.html }}\
                                {{= it.html }}\
                            {{??}}\
                                <p>{{= it.text }}</p>\
                            {{?}}\
                        </div>\
                    {{?}}\
                    <div class="modal-footer">\
                        {{~ it.buttons :btn }}\
                            <button type="button"\
                                class="btn btn-{{= btn.type }}"\
                                ml-bind="[events]:{{= btn.name }}">{{= btn.label }}</button>\
                        {{~}}\
                    </div>\
                </div>\
            </div>'
    }
});

componentsRegistry.add(MLDialog);

module.exports = MLDialog;


_.extend(MLDialog, {
    createDialog: MLDialog$$createDialog,
    openDialog: MLDialog$$openDialog,
    getOpenedDialog: MLDialog$$getOpenedDialog
});


_.extendProto(MLDialog, {
    openDialog: MLDialog$openDialog,
    closeDialog: MLDialog$closeDialog,
});


/**
 * Creates and returns dialog instance. To create and open at the same time [openDialog](#MLDialog$$openDialog)
 * `options` is an object with the following properties:
 *
 *     title: optional dialog title
 *     html: optional dialog text as html (will take precedence over text if both text nd html are passed)
 *       or
 *     text: optional dialog text
 *     close: optional false to prevent backdrop and esc key from closing the dialog and removing close button in top right corner
 *            or true (default) to enable all close options
 *            or object with properties
 *         backdrop: false or true (default), close dialog when backdrop clicked
 *         keyboard: false or true (default), close dialog when esc key is pressed
 *         button: false or true (default), show close button in the header (won't be shown if there is no header when title is not passed)
 *     buttons: optional array of buttons configurations, where each button config is an object
 *         name:   optional name of component, should be unique and should not be `closeBtn`, if not passed a timestamp based name will be used
 *         type:   button type, will determine button CSS style. Possible types are: defult, primary, success, info, warning, danger, link (map to related bootstrap button styles)
 *         label:  button label
 *         close:  optional false to prevent this button from closing dialog
 *         result: string with dialog close result that will be passed to dialog subscriber as the first parameter
 *         data:   any value/object or function to create data that will be passed to dialog subscriber as the second parameter.
 *                 If function is passed it will be called with dialog as context and button options as parameter.
 *
 *     If `title` is not passed, dialog will not have title section   
 *     If neither `text` nor `html` is passed, dialog will not have body section.
 *     If `buttons` are not passed, there will only be OK button.
 *
 * When dialog is closed, the subscriber is called with reault and optional data as defined in buttons configurations.
 * If backdrop is clicked or ESC key is pressed the result will be 'dismissed'
 * If close button in the top right corner is clicked, the result will be 'closed' (default result)
 * 
 * @param {Object} options dialog configuration.
 */
function MLDialog$$createDialog(options) {
    check(options, {
        title: Match.Optional(String),
        html: Match.Optional(String),
        text: Match.Optional(String),
        close: Match.Optional(Match.OneOf(Boolean, {
            backdrop: Match.Optional(Boolean),
            keyboard: Match.Optional(Boolean),
            button: Match.Optional(Boolean)
        })),
        buttons: Match.Optional([ {
            name: Match.Optional(String),
            type: String,
            label: String,
            close: Match.Optional(Boolean),
            result: Match.Optional(String),
            data: Match.Optional(Match.Any),
        } ])
    });

    var dialog = MLDialog.createOnElement();

    options = _prepareOptions(options);
    dialog._dialog = {
        options: options,
        visible: false
    };

    dialog.template
        .render(options)
        .binder();

    var dialogScope = dialog.container.scope;

    if (options.close.backdrop)
        dialog.events.on('click',
            { subscriber: _onBackdropClick, context: dialog });

    if (options.title && options.close.button)
        dialogScope.closeBtn.events.on('click',
            { subscriber: _onCloseBtnClick, context: dialog });

    options.buttons.forEach(function(btn) {
        var buttonSubscriber = {
            subscriber: _.partial(_dialogButtonClick, btn),
            context: dialog
        };
        dialogScope[btn.name].events.on('click', buttonSubscriber);
    });

    return dialog;
}


function _dialogButtonClick(button) {
    if (button.close !== false)
        _toggleDialog.call(this, false)

    var data = _.result(button.data, this, button);
    _dispatchResult.call(this, button.result, data);
}


function _dispatchResult(result, data) {
    var subscriber = this._dialog.subscriber;
    if (typeof subscriber == 'function')
        subscriber.call(this, result, data);
    else
        subscriber.subscriber.call(subscriber.context, result, data);
}


function _onBackdropClick(eventType, event) {
    if (event.target == this.el)
        this.closeDialog('dismissed');
}


function _onCloseBtnClick() {
    this.closeDialog('closed');
}


function _onKeyDown(event) {
    if (openedDialog
            && openedDialog._dialog.options.close.keyboard
            && event.keyCode == 27) // esc key
        openedDialog.closeDialog('dismissed');
}


function _prepareOptions(options) {
    options = _.clone(options);
    options.buttons = _.clone(options.buttons || DEFAULT_BUTTONS);
    options.buttons.forEach(function(btn) {
        if (! btn.name)
            btn.name = componentName();
    });

    options.close = typeof options.close == 'undefined' || options.close === true
                        ? _.object(CLOSE_OPTIONS, true)
                        : typeof options.close == 'object'
                            ? _.mapToObject(CLOSE_OPTIONS,
                                function(opt) { return options.close[opt] !== false; })
                            : _.object(CLOSE_OPTIONS, false);

    return options;
}


/**
 * Create and show dialog popup
 * 
 * @param {Object} options object with title, text and buttons. See [createDialog](#MLDialog$$createDialog) for more information.
 * @param {Function|Object} subscriber optional subscriber function or object that is passed result and optional data. Unless context is defined, dialog will be the context.
 */
function MLDialog$$openDialog(options, subscriber) {
    var dialog = MLDialog.createDialog(options);
    dialog.openDialog(subscriber);
    return dialog;
}



function _toggleDialog(doShow) {
    doShow = typeof doShow == 'undefined'
                ? ! this._dialog.visible
                : !! doShow;

    var addRemove = doShow ? 'add' : 'remove'
        , appendRemove = doShow ? 'appendChild' : 'removeChild';

    this._dialog.visible = doShow;

    if (doShow && ! dialogsInitialized)
        _initializeDialogs();

    document.body[appendRemove](this.el);
    if (backdropEl)
        document.body[appendRemove](backdropEl);
    this.dom.toggle(doShow);
    this.el.setAttribute('aria-hidden', !doShow);
    document.body.classList[addRemove]('modal-open');
    this.el.classList[addRemove]('in');

    openedDialog = doShow ? this : undefined;
    this.el[doShow ? 'focus' : 'blur']();
}


var dialogsInitialized, backdropEl;

function _initializeDialogs() {
    backdropEl = document.createElement('div');
    backdropEl.className = 'modal-backdrop fade in';
    document.addEventListener('keydown', _onKeyDown);
    dialogsInitialized = true;
}


var openedDialog;

/**
 * Opens dialog instance.
 * Subscriber object should have the same format as the subscriber for the Messenger (although Messenger is not used) - either function or object with subscriber and context properties.
 * 
 * @param {Function|Object} subscriber subscriber object
 */
function MLDialog$openDialog(subscriber) {
    check(subscriber, Match.OneOf(Function, { subscriber: Function, context: Match.Any }));

    if (openedDialog)
        return logger.warn('MLDialog openDialog: can\'t open dialog, another dialog is already open');

    this._dialog.subscriber = subscriber;
    _toggleDialog.call(this, true);
}


/**
 * Closes dialog instance, optionally passing result and data to dialog subscriber.
 * If no result is passed, 'closed' will be passed to subscriber.
 *
 * @param {String} result dialog result, passed as the first parameter to subcsriber
 * @param {Any} data optional dialog data, passed as the second parameter to subscriber
 */
function MLDialog$closeDialog(result, data) {
    if (! openedDialog)
        return logger.warn('MLDialog closeDialog: can\'t close dialog, no dialog open');

    result = result || 'closed';

    _toggleDialog.call(this, false);
    _dispatchResult.call(this, result, data);
}


/**
 * Returns currently opened dialog
 *
 * @return {MLDialog}
 */
function MLDialog$$getOpenedDialog() {
    return openedDialog;
}

},{"../../../util/check":88,"../../../util/component_name":89,"../../../util/logger":98,"../../c_class":16,"../../c_registry":33,"mol-proto":109}],63:[function(require,module,exports){
'use strict';

var Component = require('../../c_class')
    , componentsRegistry = require('../../c_registry')
    , _ = require('mol-proto')
    , logger = require('../../../util/logger');


var TOGGLE_CSS_CLASS = 'dropdown-toggle'
    , MENU_CSS_CLASS = 'dropdown-menu';


var MLDropdown = Component.createComponentClass('MLDropdown', {
    events: undefined,
    dom: {
        cls: ['ml-bs-dropdown', 'dropdown']
    }
});

componentsRegistry.add(MLDropdown);

module.exports = MLDropdown;


_.extendProto(MLDropdown, {
    start: MLDropdown$start,
    destroy: MLDropdown$destroy,
    toggleMenu: MLDropdown$toggleMenu,
    showMenu: MLDropdown$showMenu,
    hideMenu: MLDropdown$hideMenu
});


function MLDropdown$start() {
    var toggleEl = this.el.querySelector('.' + TOGGLE_CSS_CLASS)
        , menuEl = this.el.querySelector('.' + MENU_CSS_CLASS);

    if (! (toggleEl && menuEl))
        return logger.error('MLDropdown:', TOGGLE_CSS_CLASS, 'or', MENU_CSS_CLASS, 'isn\'t found');

    var clickHandler = this.toggleMenu.bind(this, undefined)
        , docClickHandler = _onClick.bind(this);

    this._dropdown = {
        toggle: toggleEl,
        menu: menuEl,
        clickHandler: clickHandler,
        docClickHandler: docClickHandler,
        visible: false
    };
    this.hideMenu();
    toggleEl.addEventListener('click', clickHandler);
    window.document.addEventListener('click', docClickHandler);
}


function _onClick(event) {

    var domOwner = this.el;
    
    if (event && event.target)
        var node = domParents(event.target.parentNode, function (node) {
            return node == domOwner;
        });

    if (event && !node)
        this.hideMenu();
}


function domParents(node, validation) {
    while (node) {
        if (validation(node))
            return node;
        node = node.parentNode;
    }
}


function MLDropdown$destroy() {
    var dd = this._dropdown;
    dd.toggle.removeEventListener('click', dd.clickHandler);
    window.document.removeEventListener('click', dd.docClickHandler);
    delete this._dropdown;
    Component.prototype.destroy.apply(this, arguments);
}


function MLDropdown$showMenu() {
    this.toggleMenu(true);
}


function MLDropdown$hideMenu() {
    this.toggleMenu(false);
}


function MLDropdown$toggleMenu(doShow) {
    doShow = typeof doShow == 'undefined'
                ? ! this._dropdown.visible
                : !! doShow;

    this._dropdown.visible = doShow;

    var menu = this._dropdown.menu;
    menu.style.display = doShow
                            ? 'block'
                            : 'none';
}

},{"../../../util/logger":98,"../../c_class":16,"../../c_registry":33,"mol-proto":109}],64:[function(require,module,exports){
'use strict';


// <a name="config"></a>
// milo.config
// -----------

// It is the function that allows to change milo configurations and also
// access them on config's properties.

// ```javascript
// milo.config({
//     attrs: {
//         bind: 'ml-bind',
//         load: 'ml-load'
//     }
// });
// ```


var _ = require('mol-proto')
    , doT = require('dot');


module.exports = config;

function config(options) {
    _.deepExtend(config, options);
}

config({
    attrs: {
        bind: 'ml-bind',
        load: 'ml-load'
    },
    componentRef: '___milo_component',
    componentPrefix: 'milo_',
    template: {
        compile: doT.compile
    },
    domStorage: {
        typeSuffix: ':___milo_data_type',
        prefixSeparator: '/',
        root: '',
        messageKey: '___milo_message/',
        messageTimestamp: '___milo_timestamp'
    },
    dragDrop: {
        dataTypes: {
            component: 'x-application/milo/component',
            componentMetaTemplate: 'x-application/milo/component-meta/%class/%name/%params',
            componentMetaRegex: /^x\-application\/milo\/component\-meta\/([a-z0-9]+)\/([a-z0-9]+)\/([a-z0-9]*)$/,
        }
    },
    request: {
        jsonpTimeout: 15 // seconds
    },
    check: true,
    debug: false
});

},{"dot":107,"mol-proto":109}],65:[function(require,module,exports){
'use strict';


var miloMail = require('./mail')
    , request = require('./util/request')
    , logger = require('./util/logger')
    , utilDom = require('./util/dom')
    , config = require('./config')
    , LoadAttribute = require('./attributes/a_load')
    , LoaderError = require('./util/error').Loader;


module.exports = loader;

/**
 * `milo.loader`
 * 
 * Recursively scans the document tree inside `rootEl` (document.body by default) looking for __ml-load__ @attribute.
 * One level load is executed. No additional loader get called on inside __ml-load__ attributes. 
 *
 * Possible usages:
 * - milo.loader([myRootEl,][myRemoveAttribute,]myCallback)
 * 
 * @param  {Element}  rootEl          Root element inside which DOM will be scanned (document.body by default).
 * @param  {Boolean}  removeAttribute If set to true, then the __ml-load__ attribute will be removed once loader has been executed (False by default).
 * @param  {Function} callback        Callback to call after all elements get loaded (Required).
 */
function loader(rootEl, removeAttribute, callback) {
    milo(function() {
        _loader(rootEl, removeAttribute, callback);
    });
}


function _loader(rootEl, removeAttribute, callback) {
    if (typeof rootEl == 'function') {
        callback = rootEl;
        rootEl = undefined;
        removeAttribute = false;
    }

    if (typeof removeAttribute == 'function') {
        callback = removeAttribute;
        removeAttribute = false;
    }

    rootEl = rootEl || document.body;

    miloMail.postMessage('loader', { state: 'started' });
    _loadViewsInElement(rootEl, removeAttribute, function(views) {
        miloMail.postMessage('loader', { 
            state: 'finished',
            views: views
        });
        callback(views);
    });
}


function _loadViewsInElement(rootEl, removeAttribute, callback) {
    var loadElements = rootEl.getAttribute(config.attrs.load)
                        ? [rootEl]
                        : rootEl.querySelectorAll('[' + config.attrs.load + ']');

    var views = {}
        , totalCount = loadElements.length
        , loadedCount = 0;

    _.forEach(loadElements, function (el) {
        loadView(el, removeAttribute, function(err) {
            views[el.id] = err || el;
            loadedCount++;
            if (loadedCount == totalCount)
                callback(views);
        });
    });
};


function loadView(el, removeAttribute, callback) {
    if (utilDom.children(el).length)
        throw new LoaderError('can\'t load html into element that is not empty');

    var attr = new LoadAttribute(el);

    attr.parse().validate();

    request.get(attr.loadUrl, function(err, html) {
        if (err) {
            err.message = err.message || 'can\'t load file ' + attr.loadUrl;
            // logger.error(err.message);
            callback(err);
            return;
        }

        el.innerHTML = html;
        if (removeAttribute) LoadAttribute.remove(el);
        callback(null);
    });
}

},{"./attributes/a_load":7,"./config":64,"./mail":66,"./util/dom":91,"./util/error":94,"./util/logger":98,"./util/request":101}],66:[function(require,module,exports){
'use strict';

/**
 * `milo.mail`
 * It is an application level messenger that is an instance of Messenger class.
 *
 * At the moment, in addition to application messages that you define, you can subscribe to __domready__ message that is guaranteed to fire once,
 * even if DOM was ready at the time of the subscription.
 *
 * Messaging between frames is available via milo.mail. See [Frame facet](../components/c_facets/Frame.js.html).
 *
 * See [Messenger](../messenger/index.js.html).
 * 
**/


var Messenger = require('../messenger')
    , MailMsgAPI = require('./mail_api')
    , MailMessageSource = require('./mail_source')
    , _ = require('mol-proto');


var miloMail = new Messenger;

var mailMsgSource = new MailMessageSource(miloMail, { trigger: 'trigger' }, new MailMsgAPI);

miloMail._setMessageSource(mailMsgSource);


module.exports = miloMail;

},{"../messenger":69,"./mail_api":67,"./mail_source":68,"mol-proto":109}],67:[function(require,module,exports){
'use strict';

var MessengerAPI = require('../messenger/m_api')
    , _ = require('mol-proto')
    , check = require('../util/check')
    , Match = check.Match;


var MailMsgAPI = _.createSubclass(MessengerAPI, 'MailMsgAPI', true);


_.extendProto(MailMsgAPI, {
    translateToSourceMessage: translateToSourceMessage,
    filterSourceMessage: filterSourceMessage
});

module.exports = MailMsgAPI;


// TODO: this function should return relevant DOM event dependent on element tag
// Can also implement beforedatachanged event to allow preventing the change
// translateToDomEvent
var windowMessageRegExp = /^message\:/
    , windowMessagePrefix = 'message:';

function translateToSourceMessage(message) {
    if (message == 'domready')
        return 'readystatechange';
    else if (windowMessageRegExp.test(message))
        return 'message';
}


// filterDataMessage
function filterSourceMessage(sourceMessage, msgType, msgData) {
    if (sourceMessage == 'readystatechange') {
        //return document.readyState == 'interactive';
        //  return false;
        // _.defineProperty(this, '_domReadyFired', true, _.WRIT);
        return true;
    } else if (sourceMessage == 'message')
        return windowMessagePrefix + msgData.data.type == msgType;
};

},{"../messenger/m_api":70,"../util/check":88,"mol-proto":109}],68:[function(require,module,exports){
'use strict';

var MessageSource = require('../messenger/m_source')
    , domEventsConstructors = require('../components/msg_src/de_constrs')
    , MailMessageSourceError = require('../util/error').MailMessageSource
    , _ = require('mol-proto')
    , check = require('../util/check')
    , Match = check.Match;


var MailMessageSource = _.createSubclass(MessageSource, 'MailMessageSource', true);


_.extendProto(MailMessageSource, {
    // implementing MessageSource interface
    addSourceSubscriber: addSourceSubscriber,
    removeSourceSubscriber: removeSourceSubscriber,
    trigger: trigger,

    // class specific methods
    _windowSubscriberMethod: _windowSubscriberMethod,
    handleEvent: handleEvent,  // event dispatcher - as defined by Event DOM API
});


module.exports = MailMessageSource;


function addSourceSubscriber(sourceMessage) {
    if (isReadyStateChange(sourceMessage)) {
        if (document.readyState == 'loading')
            document.addEventListener('readystatechange', this, false);
        else {
            var EventConstructor = domEventsConstructors.readystatechange;
            var domEvent = new EventConstructor('readystatechange', { target: document });
            this.dispatchMessage('readystatechange', domEvent);
        }
    } else
        this._windowSubscriberMethod('addEventListener', sourceMessage);
}


function removeSourceSubscriber(sourceMessage) {
    if (isReadyStateChange(sourceMessage))
        document.removeEventListener('readystatechange', this, false);
    else 
        this._windowSubscriberMethod('removeEventListener', sourceMessage);
}


function isReadyStateChange(sourceMessage) {
    return sourceMessage == 'readystatechange' && typeof document == 'object';
}

function isWindowMessage(sourceMessage) {
    return sourceMessage == 'message' && typeof window == 'object';
}

function _windowSubscriberMethod(method, sourceMessage) {
    if (isWindowMessage(sourceMessage))
        window[method]('message', this, false);
}


// event dispatcher - as defined by Event DOM API
function handleEvent(event) {
    this.dispatchMessage(event.type, event);
}


function trigger(msgType, data) {
    data = data || {};
    data.type = 'message:' + msgType;
    
    if (typeof window == 'object')
        window.postMessage(data, '*')
}

},{"../components/msg_src/de_constrs":38,"../messenger/m_source":72,"../util/check":88,"../util/error":94,"mol-proto":109}],69:[function(require,module,exports){
'use strict';

var Mixin = require('../abstract/mixin')
    // , MessageSource = require('./message_source')
    , MessageSource = require('./m_source')
    , _ = require('mol-proto')
    , check = require('../util/check')
    , Match = check.Match
    , MessengerError = require('../util/error').Messenger;


/**
 * `milo.Messenger`
 * A generic Messenger class that is used for all kinds of messaging in milo. It is subclassed from [Mixin](../abstract/mixin.js.html) and it proxies its methods to the host object for convenience.
 * All facets and components have messenger attached to them. Messenger class interoperates with [MessageSource](./m_source.js.html) class that connects the messenger to some external source of messages (e.g., DOM events) and [MessengerAPI](./m_api.js.html) class that allows to define higher level messages than messages that exist on the source.
 * Messenger class is used internally in milo and can be used together with any objects/classes in the application.
 * milo also defines a global messenger [milo.mail](../mail/index.js.html) that dispatches `domready` event and can be used for any application wide messaging.
 * To initialize your app after DOM is ready use:
 * ```
 * milo.mail.on('domready', function() {
 *     // application starts    
 * });
 * ```
 * or the following shorter form of the same:
 * ```
 * milo(function() {
 *     // application starts    
 * });
 * ```
 */
var Messenger = _.createSubclass(Mixin, 'Messenger');

var messagesSplitRegExp = Messenger.messagesSplitRegExp = /\s*(?:\,|\s)\s*/;


/**
 * ####Messenger instance methods####
 *
 * - [init](#init)
 * - [on](#Messenger$on) (alias - onMessage, deprecated)
 * - [off](#Messenger$off) (alias - offMessage, deprecated)
 * - [onMessages](#onMessages)
 * - [offMessages](#offMessages)
 * - [once](#once)
 * - [postMessage](#postMessage)
 * - [getSubscribers](#getSubscribers)
 *
 * "Private" methods
 *
 * - [_chooseSubscribersHash](#_chooseSubscribersHash)
 * - [_registerSubscriber](#_registerSubscriber)
 * - [_removeSubscriber](#_removeSubscriber)
 * - [_removeAllSubscribers](#_removeAllSubscribers)
 * - [_callPatternSubscribers](#_callPatternSubscribers)
 * - [_callSubscribers](#_callSubscribers)
 * - [_setMessageSource](#_setMessageSource)
 * - [getMessageSource](#getMessageSource)
 */
_.extendProto(Messenger, {
    init: init, // called by Mixin (superclass)
    destroy: Messenger$destroy,
    on: Messenger$on,
    once: _.partial(_Messenger_onWithOptions, { dispatchTimes: 1 }),
    onSync: _.partial(_Messenger_onWithOptions, { sync: true }),
    onAsync: _.partial(_Messenger_onWithOptions, { sync: false }),
    onMessage: Messenger$on, // deprecated
    off: Messenger$off,
    offMessage: Messenger$off, // deprecated
    onMessages: onMessages,
    offMessages: offMessages,
    offAll: Messenger$offAll,
    postMessage: postMessage,
    postMessageSync: postMessageSync,
    getSubscribers: getSubscribers,
    getMessageSource: getMessageSource,
    _chooseSubscribersHash: _chooseSubscribersHash,
    _registerSubscriber: _registerSubscriber,
    _removeSubscriber: _removeSubscriber,
    _removeAllSubscribers: _removeAllSubscribers,
    _callPatternSubscribers: _callPatternSubscribers,
    _callSubscribers: _callSubscribers,
    _callSubscriber: _callSubscriber,
    _setMessageSource: _setMessageSource
});


/**
 * A default map of proxy methods used by ComponentFacet and Component classes to pass to Messenger when it is instantiated.
 * This map is for convenience only, it is NOT used internally by Messenger, a host class should pass it for methods to be proxied this way.
 */
Messenger.defaultMethods = {
    on: 'on',
    once: 'once',
    onSync: 'onSync',
    off: 'off',
    onMessages: 'onMessages',
    offMessages: 'offMessages',
    postMessage: 'postMessage',
    postMessageSync: 'postMessageSync',
    getSubscribers: 'getSubscribers'
};


module.exports = Messenger;


/**
 * Messenger instance method
 * Initializes Messenger. Method is called by Mixin class constructor.
 * See [on](#Messenger$on) method, [Messenger](#Messenger) class above and [MessageSource](./m_source.js.html) class.
 *
 * @param {Object} hostObject Optional object that stores the messenger on one of its properties. It is used to proxy methods of messenger and also as a context for subscribers when they are called by the Messenger. See `on` method.
 * @param {Object} proxyMethods Optional map of method names; key - proxy method name, value - messenger's method name.
 * @param {MessageSource} messageSource Optional messageSource linked to the messenger. If messageSource is supplied, the reference to the messenger will stored on its 'messenger' property
 */
function init(hostObject, proxyMethods, messageSource) {
    // hostObject and proxyMethods are used in Mixin and checked there
    if (messageSource)
        this._setMessageSource(messageSource);

    _initializeSubscribers.call(this);
}


function _initializeSubscribers() {
    _.defineProperties(this, {
        _messageSubscribers: {},
        _patternMessageSubscribers: {},
    }, _.CONF);
}


/**
 * Destroys messenger. Maybe needs to unsubscribe all subscribers
 */
function Messenger$destroy() {
    this.offAll();
    var messageSource = this.getMessageSource();
    if (messageSource)
        messageSource.destroy();
}


/**
 * Messenger instance method.
 * Registers a subscriber function for a certain message(s).
 * This method returns `true` if the subscription was successful. It can be unsuccessful if the passed subscriber has already been subscribed to this message type - double subscription never happens and it is safe to subscribe again - no error or warning is thrown or logged.
 * Subscriber is passed two parameters: `message` (string) and `data` (object). Data object is supplied when message is dispatched, Messenger itself adds nothing to it. For example, [events facet](../components/c_facets/Events.js.html) sends actual DOM event when it posts message.
 * Usage:
 * ```
 * // subscribes onMouseUpDown to two DOM events on component via events facet.
 * myComp.events.on('mousedown mouseup', onMouseUpDown);
 * function onMouseUpDown(eventType, event) {
 *     // ...
 * }
 *
 * myComp.data.on(/.+/, function(msg, data) {
 *     logger.debug(msg, data);
 * }); // subscribes anonymous function to all non-empty messages on data facet
 * // it will not be possible to unsubscribe anonymous subscriber separately,
 * // but myComp.data.off(/.+/) will unsubscribe it
 * ```
 * If messenger has [MessageSource](./m_source.js.html) attached to it, MessageSource will be notified when the first subscriber for a given message is added, so it can subscribe to the source.
 * [Components](../components/c_class.js.html) and [facets](../components/c_facet.js.html) change this method name to `on` when they proxy it.
 * See [postMessage](#postMessage).
 * 
 * @param {String|Array[String]|RegExp} messages Message types that should envoke the subscriber.
 *  If string is passed, it can be a sigle message or multiple message types separated by whitespace with optional commas.
 *  If an array of strings is passed, each string is a message type to subscribe for.
 *  If a RegExp is passed, the subscriber will be envoked when the message dispatched on the messenger matches the pattern (or IS the RegExp with identical pattern).
 *  Pattern subscriber does NOT cause any subscription to MessageSource, it only captures messages that are already subscribed to with precise message types.
 * @param {Function|Object} subscriber Message subscriber - a function that will be called when the message is dispatched on the messenger (usually via proxied postMessage method of host object).
 *  If hostObject was supplied to Messenger constructor, hostObject will be the context (the value of this) for the subscriber envocation.
 *  Subscriber can also be an object with properties `subscriber` (function) and `context` ("this" value when subscriber is called)
 * @return {Boolean}
 */
function Messenger$on(messages, subscriber) {
    check(messages, Match.OneOf(String, [String], RegExp));
    check(subscriber, Match.OneOf(Function, {
        subscriber: Function,
        context: Match.Any,
        options: Match.Optional(Object)
    }));

    return _Messenger_on.call(this, messages, subscriber)
}

function _Messenger_on(messages, subscriber) {
    if (typeof subscriber == 'object')
        _.defineProperty(subscriber, '__messages', messages);

    if (typeof messages == 'string')
        messages = messages.split(messagesSplitRegExp);

    var subscribersHash = this._chooseSubscribersHash(messages);

    if (messages instanceof RegExp)
        return this._registerSubscriber(subscribersHash, messages, subscriber);

    else {
        var wasRegistered = false;

        messages.forEach(function(message) {
            var notYetRegistered = this._registerSubscriber(subscribersHash, message, subscriber);          
            wasRegistered = wasRegistered || notYetRegistered;          
        }, this);

        return wasRegistered;
    }   
}


function _Messenger_onWithOptions(options, messages, subscriber) {
    check(messages, Match.OneOf(String, [String], RegExp));
    check(subscriber, Match.OneOf(Function, {
        subscriber: Function,
        context: Match.Any,
        options: Match.Optional(Object),
    }));

    if (typeof subscriber == 'function')
        subscriber = {
            subscriber: subscriber,
            context: this._hostObject,
            options: options
        };

    subscriber.options = subscriber.obtions || {};
    _.extend(subscriber.options, options);

    return _Messenger_on.call(this, messages, subscriber);
}


/**
 * "Private" Messenger instance method
 * It is called by [on](#Messenger$on) to register subscriber for one message type.
 * Returns `true` if this subscriber is not yet registered for this type of message.
 * If messenger has [MessageSource](./m_source.js.html) attached to it, MessageSource will be notified when the first subscriber for a given message is added.
 *
 * @private
 * @param {Object} subscribersHash The map of subscribers determined by [on](#Messenger$on) based on Message type, can be `this._patternMessageSubscribers` or `this._messageSubscribers`
 * @param {String} message Message type
 * @param {Function|Object} subscriber Subscriber function to be added or object with properties `subscriber` (function) and `context` (value of "this" when subscriber is called)
 * @return {Boolean}
 */
function _registerSubscriber(subscribersHash, message, subscriber) {
    if (! (subscribersHash[message] && subscribersHash[message].length)) {
        subscribersHash[message] = [];
        if (message instanceof RegExp)
            subscribersHash[message].pattern = message;
        if (this._messageSource)
            this._messageSource.onSubscriberAdded(message);
        var noSubscribers = true;
    }

    var msgSubscribers = subscribersHash[message];
    var notYetRegistered = noSubscribers || _indexOfSubscriber.call(this, msgSubscribers, subscriber) == -1;

    if (notYetRegistered)
        msgSubscribers.push(subscriber);

    return notYetRegistered;
}


/**
 * Finds subscriber index in the list
 *
 * @param {Array[Function|Object]} list list of subscribers
 * @param {Function|Object} subscriber subscriber function or object with properties `subscriber` (function) and `context` ("this" object)
 */
function _indexOfSubscriber(list, subscriber) {
    var isFunc = typeof subscriber == 'function'
        , self = this;
    return _.findIndex(list, function(subscr){
        var subscrIsFunc = typeof subscr == 'function';
        return isFunc == subscrIsFunc
                ? ( isFunc
                    ? subscriber == subscr
                    : (subscriber.subscriber == subscr.subscriber 
                        && subscriber.context == subscr.context) )
                : subscrIsFunc
                    ? _subcribersFuncEqObj(subscr, subscriber)
                    : _subcribersFuncEqObj(subscriber, subscr)
    });

    function _subcribersFuncEqObj(func, obj) {
        return func == obj.subscriber
                && self._hostObject == obj.context;
    }
}


/**
 * Messenger instance method.
 * Subscribes to multiple messages passed as map together with subscribers.
 * Usage:
 * ```
 * myComp.events.onMessages({
 *     'mousedown': onMouseDown,
 *     'mouseup': onMouseUp
 * });
 * function onMouseDown(eventType, event) {}
 * function onMouseUp(eventType, event) {}
 * ```
 * Returns map with the same keys (message types) and boolean values indicating whether particular subscriber was added.
 * It is NOT possible to add pattern subscriber using this method, as although you can use RegExp as the key, JavaScript will automatically convert it to string.
 *
 * @param {Object[Function]} messageSubscribers Map of message subscribers to be added
 * @return {Object[Boolean]}
 */
function onMessages(messageSubscribers) {
    check(messageSubscribers, Match.ObjectHash(Match.OneOf(Function, { subscriber: Function, context: Match.Any })));

    var notYetRegisteredMap = _.mapKeys(messageSubscribers, function(subscriber, messages) {
        return this.on(messages, subscriber);
    }, this);

    return notYetRegisteredMap;
}


/**
 * Messenger instance method.
 * Removes a subscriber for message(s). Removes all subscribers for the message if subscriber isn't passed.
 * This method returns `true` if the subscriber was registered. No error or warning is thrown or logged if you remove subscriber that was not registered.
 * [Components](../components/c_class.js.html) and [facets](../components/c_facet.js.html) change this method name to `off` when they proxy it.
 * Usage:
 * ```
 * // unsubscribes onMouseUpDown from two DOM events.
 * myComp.events.off('mousedown mouseup', onMouseUpDown);
 * ```
 * If messenger has [MessageSource](./m_source.js.html) attached to it, MessageSource will be notified when the last subscriber for a given message is removed and there is no more subscribers for this message.
 *
 * @param {String|Array[String]|RegExp} messages Message types that a subscriber should be removed for.
 *  If string is passed, it can be a sigle message or multiple message types separated by whitespace with optional commas.
 *  If an array of strings is passed, each string is a message type to remove a subscriber for.
 *  If a RegExp is passed, the pattern subscriber will be removed.
 *  RegExp subscriber does NOT cause any subscription to MessageSource, it only captures messages that are already subscribed to with precise message types.
 * @param {Function} subscriber Message subscriber - Optional function that will be removed from the list of subscribers for the message(s). If subscriber is not supplied, all subscribers will be removed from this message(s).
 * @return {Boolean}
 */
function Messenger$off(messages, subscriber) {
    check(messages, Match.OneOf(String, [String], RegExp));
    check(subscriber, Match.Optional(Match.OneOf(Function, {
        subscriber: Function,
        context: Match.Any,
        options: Match.Optional(Object),
        // __messages: Match.Optional(Match.OneOf(String, [String], RegExp))
    }))); 

    return _Messenger_off.call(this, messages, subscriber);
}

function _Messenger_off(messages, subscriber) {
    if (typeof messages == 'string')
        messages = messages.split(messagesSplitRegExp);

    var subscribersHash = this._chooseSubscribersHash(messages);

    if (messages instanceof RegExp)
        return this._removeSubscriber(subscribersHash, messages, subscriber);

    else {
        var wasRemoved = false;

        messages.forEach(function(message) {
            var subscriberRemoved = this._removeSubscriber(subscribersHash, message, subscriber);           
            wasRemoved = wasRemoved || subscriberRemoved;           
        }, this);

        return wasRemoved;
    }
}


/**
 * "Private" Messenger instance method
 * It is called by [off](#Messenger$off) to remove subscriber for one message type.
 * Returns `true` if this subscriber was registered for this type of message.
 * If messenger has [MessageSource](./m_source.js.html) attached to it, MessageSource will be notified when the last subscriber for a given message is removed and there is no more subscribers for this message.
 *
 * @private
 * @param {Object} subscribersHash The map of subscribers determined by [off](#Messenger$off) based on message type, can be `this._patternMessageSubscribers` or `this._messageSubscribers`
 * @param {String} message Message type
 * @param {Function} subscriber Subscriber function to be removed
 * @return {Boolean}
 */
function _removeSubscriber(subscribersHash, message, subscriber) {
    var msgSubscribers = subscribersHash[message];
    if (! msgSubscribers || ! msgSubscribers.length)
        return false; // nothing removed

    if (subscriber) {
        var subscriberIndex = _indexOfSubscriber.call(this, msgSubscribers, subscriber);
        if (subscriberIndex == -1) 
            return false; // nothing removed
        msgSubscribers.splice(subscriberIndex, 1);
        if (! msgSubscribers.length)
            this._removeAllSubscribers(subscribersHash, message);

    } else 
        this._removeAllSubscribers(subscribersHash, message);

    return true; // subscriber(s) removed
}


/**
 * "Private" Messenger instance method
 * It is called by [_removeSubscriber](#_removeSubscriber) to remove all subscribers for one message type.
 * If messenger has [MessageSource](./m_source.js.html) attached to it, MessageSource will be notified that all message subscribers were removed so it can unsubscribe from the source.
 *
 * @private
 * @param {Object} subscribersHash The map of subscribers determined by [off](#Messenger$off) based on message type, can be `this._patternMessageSubscribers` or `this._messageSubscribers`
 * @param {String} message Message type
 */
function _removeAllSubscribers(subscribersHash, message) {
    delete subscribersHash[message];
    if (this._messageSource && typeof message == 'string')
        this._messageSource.onSubscriberRemoved(message);
}


/**
 * Messenger instance method.
 * Unsubscribes from multiple messages passed as map together with subscribers.
 * Returns map with the same keys (message types) and boolean values indicating whether particular subscriber was removed.
 * If a subscriber for one of the messages is not supplied, all subscribers for this message will be removed.
 * Usage:
 * ```
 * myComp.events.offMessages({
 *     'mousedown': onMouseDown,
 *     'mouseup': onMouseUp,
 *     'click': undefined // all subscribers to this message will be removed
 * });
 * ```
 * It is NOT possible to remove pattern subscriber(s) using this method, as although you can use RegExp as the key, JavaScript will automatically convert it to string.
 *
 * @param {Object[Function]} messageSubscribers Map of message subscribers to be removed
 * @return {Object[Boolean]}
 */
function offMessages(messageSubscribers) {
    check(messageSubscribers, Match.ObjectHash(Match.Optional(Match.OneOf(Function, { subscriber: Function, context: Match.Any }))));

    var subscriberRemovedMap = _.mapKeys(messageSubscribers, function(subscriber, messages) {
        return this.off(messages, subscriber);
    }, this);

    return subscriberRemovedMap;    
}


/**
 * Unsubscribes all subscribers
 */
function Messenger$offAll() {
    _offAllSubscribers.call(this, this._patternMessageSubscribers);
    _offAllSubscribers.call(this, this._messageSubscribers);
}


function _offAllSubscribers(subscribersHash) {
    _.eachKey(subscribersHash, function(subscribers, message) {
        this._removeAllSubscribers(subscribersHash, message);
    }, this);
}


// TODO - send event to messageSource


/**
 * Messenger instance method.
 * Dispatches the message calling all subscribers registered for this message and, if the message is a string, calling all pattern subscribers when message matches the pattern.
 * Each subscriber is passed the same parameters that are passed to theis method.
 * The context of the subscriber envocation is set to the host object (`this._hostObject`) that was passed to the messenger constructor.
 * Subscribers are called in the next tick ("asynchronously") apart from those that were subscribed with `onSync` (or that have `options.sync == true`).
 * 
 * @param {String|RegExp} message message to be dispatched
 *  If the message is a string, the subscribers registered with exactly this message will be called and also pattern subscribers registered with the pattern that matches the dispatched message.
 *  If the message is RegExp, only the subscribers registered with exactly this pattern will be called.
 * @param {Any} data data that will be passed to the subscriber as the second parameter. Messenger does not modify this data in any way.
 * @param {Function} callback optional callback to pass to subscriber
 * @param {Boolean} _synchronous if true passed, subscribers will be envoked synchronously apart from those that have `options.sync == false`. This parameter should not be used, instead postMessageSync should be used.
 */
function postMessage(message, data, callback, _synchronous) {
    check(message, Match.OneOf(String, RegExp));
    check(callback, Match.Optional(Function));

    var subscribersHash = this._chooseSubscribersHash(message);
    var msgSubscribers = subscribersHash[message];

    this._callSubscribers(message, data, callback, msgSubscribers, _synchronous);

    if (typeof message == 'string')
        this._callPatternSubscribers(message, data, callback, msgSubscribers, _synchronous);
}


/**
 * Same as postMessage apart from envoking subscribers synchronously, apart from those subscribed with `onAsync` (or with `options.sync == false`).
 * 
 * @param {String|RegExp} message
 * @param {Any} data
 * @param {Function} callback
 */
function postMessageSync(message, data, callback) {
    this.postMessage(message, data, callback, true);
}


/**
 * "Private" Messenger instance method
 * Envokes pattern subscribers with the pattern that matches the message.
 * The method is called by [postMessage](#postMessage) - see more information there.
 *
 * @private
 * @param {String} message message to be dispatched. Pattern subscribers registered with the pattern that matches the dispatched message will be called.
 * @param {Any} data data that will be passed to the subscriber as the second parameter. Messenger does not modify this data in any way.
 * @param {Function} callback optional callback to pass to subscriber
 * @param {Array[Function|Object]} calledMsgSubscribers array of subscribers already called, they won't be called again if they are among pattern subscribers.
 */
function _callPatternSubscribers(message, data, callback, calledMsgSubscribers, _synchronous) {
    _.eachKey(this._patternMessageSubscribers, 
        function(patternSubscribers) {
            var pattern = patternSubscribers.pattern;
            if (pattern.test(message)) {
                if (calledMsgSubscribers) {
                    var patternSubscribers = patternSubscribers.filter(function(subscriber) {
                        var index = _indexOfSubscriber.call(this, calledMsgSubscribers, subscriber);
                        return index == -1;
                    });
                }
                this._callSubscribers(message, data, callback, patternSubscribers, _synchronous);
            }
        }
    , this);
}


/**
 * "Private" Messenger instance method
 * Envokes subscribers from the passed list.
 * The method is called by [postMessage](#postMessage) and [_callPatternSubscribers](#_callPatternSubscribers).
 *
 * @private
 * @param {String} message message to be dispatched, passed to subscribers as the first parameter.
 * @param {Any} data data that will be passed to the subscriber as the second parameter. Messenger does not modify this data in any way.
 * @param {Array[Function|Object]} msgSubscribers the array of message subscribers to be called. Each subscriber is called with the host object (see Messenger constructor) as the context.
 * @param {Function} callback optional callback to pass to subscriber
 */
function _callSubscribers(message, data, callback, msgSubscribers, _synchronous) {
    if (msgSubscribers && msgSubscribers.length) {
        // cloning is necessary as some of the subscribers
        // can be unsubscribed during the dispatch
        // so this array would change in the process
        msgSubscribers = msgSubscribers.slice();
        msgSubscribers.forEach(function(subscriber) {
            this._callSubscriber(subscriber, message, data, callback, _synchronous);
        }, this);
    }
}


function _callSubscriber(subscriber, message, data, callback, _synchronous) {
    var syncSubscriber = subscriber.options && subscriber.options.sync
        , synchro = (_synchronous && syncSubscriber !== false)
                  || syncSubscriber
        , self = this;

    if (typeof subscriber == 'function')
        __callFuncSubscriber(subscriber, self._hostObject);
    else
        __callObjSubscriber();


    function __callFuncSubscriber(subscriber, context) {
        if (synchro)
            subscriber.call(context, message, data, callback);
        else
            _.deferMethod(subscriber, 'call', context, message, data, callback);
    }

    function __callObjSubscriber() {
        var dispatchTimes = subscriber.options && subscriber.options.dispatchTimes;
        if (dispatchTimes <= 1) {
            var messages = subscriber.__messages;                   
            self.off(messages, subscriber);
        } else if (dispatchTimes > 1)
            subscriber.options.dispatchTimes--;

        __callFuncSubscriber(subscriber.subscriber, subscriber.context);
    }
}


/**
 * Messenger instance method.
 * Returns the array of subscribers that would be called if the message were dispatched.
 * If `includePatternSubscribers === false`, pattern subscribers with matching patters will not be included (by default they are included).
 * If there are no subscribers to the message, `undefined` will be returned, not an empty array, so it is safe to use the result in boolean tests.
 *
 * @param {String|RegExp} message Message to get subscribers for.
 *  If the message is RegExp, only pattern subscribers registered with exactly this pattern will be returned.
 *  If the message is String, subscribers registered with the string messages and pattern subscribers registered with matching pattern will be returned (unless the second parameter is false).
 * @param {Boolean} includePatternSubscribers Optional false to prevent inclusion of patter subscribers, by default they are included.
 * @return {Array|undefined}
 */
function getSubscribers(message, includePatternSubscribers) {
    check(message, Match.OneOf(String, RegExp));

    var subscribersHash = this._chooseSubscribersHash(message);
    var msgSubscribers = subscribersHash[message]
                            ? [].concat(subscribersHash[message])
                            : [];

    // pattern subscribers are incuded by default
    if (includePatternSubscribers !== false && typeof message == 'string') {
        _.eachKey(this._patternMessageSubscribers, 
            function(patternSubscribers) {
                var pattern = patternSubscribers.pattern;
                if (patternSubscribers && patternSubscribers.length
                        && pattern.test(message))
                    _.appendArray(msgSubscribers, patternSubscribers);
            }
        );
    }

    // return undefined if there are no subscribers
    return msgSubscribers.length
                ? msgSubscribers
                : undefined;
}


/**
 * "Private" Messenger instance method
 * Returns the map of subscribers for a given message type.
 *
 * @private
 * @param {String|RegExp} message Message to choose the map of subscribers for
 * @return {Object[Function]} 
 */
function _chooseSubscribersHash(message) {
    return message instanceof RegExp
                ? this._patternMessageSubscribers
                : this._messageSubscribers;
}


/**
 * Messenger instance method
 * Sets [MessageSource](./m_source.js.html) for the messenger also setting the reference to the messenger in the MessageSource.
 * MessageSource can be passed to message constructor; this method allows to set it at a later time. For example, the subclasses of [ComponentFacet](../components/c_facet.js.html) use this method to set different MessageSource'es in the messenger that is created by ComponentFacet.
 * Currently the method is implemented in such way that it can be called only once - MessageSource cannot be changed after this method is called.
 *
 * @param {MessageSource} messageSource an instance of MessageSource class to attach to this messenger (and to have this messenger attached to it too)
 */
function _setMessageSource(messageSource) {
    check(messageSource, MessageSource);

    _.defineProperty(this, '_messageSource', messageSource);
    messageSource.messenger = this;
}


/**
 * Messenger instance method
 * Returns messenger MessageSource
 *
 * @return {MessageSource}
 */
function getMessageSource() {
    return this._messageSource
}

},{"../abstract/mixin":3,"../util/check":88,"../util/error":94,"./m_source":72,"mol-proto":109}],70:[function(require,module,exports){
'use strict';

var _ = require('mol-proto')
    , logger = require('../util/logger');


module.exports = MessengerAPI;


/**
 * `milo.classes.MessengerAPI`
 * Base class, subclasses of which can supplement the functionality of [MessageSource](./m_source.js.html) by implementing three methods:
 *
 * - `translateToSourceMessage` to translate source messages (recieved from external source via `MessageSOurce`) to internal messages (that are dispatched on Messenger), allowing to make internal messages more detailed than source messages. For example, [Data facet](../components/c_facets/Data.js.html) uses [DataMsgAPI](../components/msg_api/data.js.html) to define several internal messages related to the change of state in contenteditable DOM element.
 * - `createInternalData` to modify message data received from source to some more meaningful or more detailed message data that will be dispatched on Messenger. For example, [Data facet](../components/c_facets/Data.js.html) uses [DataMsgAPI](../components/msg_api/data.js.html) (subclass of MessengerAPI) to translate DOM messages to data change messages.
 * - `filterSourceMessage` to enable/disable message dispatch based on some conditions in data.
 *
 * If `MessageSource` constructor is not passed an instance of some subclass of `MessengerAPI`, it automatically creates an instance of MessengerAPI that defines all 3 of those methods in a trivial way. See these methods below for their signatures.
 *
 * @constructor
 * @this {MessengerAPI}
 * @return {MessengerAPI}
 */
function MessengerAPI() {
    if (this.init)
        this.init.apply(this, arguments);
}


/**
 * ####MessengerAPI instance methods####
 *
 * - [init](#init) - initializes MessengerAPI
 * - [addInternalMessage](#addInternalMessage) - adds internal message
 * - [removeInternalMessage](#removeInternalMessage) - removes internal message
 * - [getInternalMessages](#getInternalMessages) - returns the list of internal messages for given source message
 *
 * These methods should be redefined by subclass:
 *
 * - [translateToSourceMessage](#translateToSourceMessage) - converts internal message type to source (external) message type
 * - [createInternalData](#createInternalData) - converts source message data received via MessageSource to internal message data
 * - [filterSourceMessage](#filterSourceMessage) - filters source message based on the data of the message and the corresponding internal message that is about to be sent on Messenger
 */
_.extendProto(MessengerAPI, {
    init: init,
    destroy: MessengerAPI$destroy,
    addInternalMessage: addInternalMessage,
    removeInternalMessage: removeInternalMessage,
    getInternalMessages: getInternalMessages,

    // should be redefined by subclass
    translateToSourceMessage: translateToSourceMessage,
    createInternalData: createInternalData,
    filterSourceMessage: filterSourceMessage
});


/**
 * MessengerAPI instance method
 * Called by MessengerAPI constructor. Subclasses that re-implement `init` method should call this method using: `MessengerAPI.prototype.init.apply(this, arguments)`
 */
function init() {
    _.defineProperty(this, '_internalMessages', {});
}


/**
 * Destroys messenger API
 */
function MessengerAPI$destroy() {

}


/**
 * MessengerAPI instance method
 * Translates internal `message` to source message, adds internal `message` to the list, making sure the same `message` wasn't passed before (it would indicate Messenger error).
 * Returns source message if it is used first time (so that `MessageSource` subcribes to this source message) or `undefined`.
 *
 * @param {String} message internal message to be translated and added
 * @return {String|undefined}
 */
function addInternalMessage(message) {
    var internalMsgs
        , sourceMessage = this.translateToSourceMessage(message);

    if (typeof sourceMessage == 'undefined') return;

    if (this._internalMessages.hasOwnProperty(sourceMessage)) {
        internalMsgs = this._internalMessages[sourceMessage];
        if (internalMsgs.indexOf(message) == -1)
            internalMsgs.push(message);
        else
            logger.warn('Duplicate addInternalMessage call for internal message ' + message);
    } else {
        internalMsgs = this._internalMessages[sourceMessage] = [];
        internalMsgs.push(message);
        return sourceMessage;
    }
}


/**
 * MessengerAPI instance method
 * Removes internal `message` from the list connected to corresponding source message (`translateToSourceMessage` is used for translation).
 * Returns source message, if the last internal message was removed (so that `MessageSource` can unsubscribe from this source message), or `undefined`.
 *
 * @param {String} message internal message to be translated and removed
 * @return {String|undefined}
 */
function removeInternalMessage(message) {
    var sourceMessage = this.translateToSourceMessage(message);

    if (typeof sourceMessage == 'undefined') return;

    var internalMsgs = this._internalMessages[sourceMessage];

    if (internalMsgs && internalMsgs.length) {
        var messageIndex = internalMsgs.indexOf(message);
        if (messageIndex >= 0) {
            internalMsgs.splice(messageIndex, 1);
            if (internalMsgs.length == 0) {
                delete this._internalMessages[sourceMessage];
                return sourceMessage;
            }
        } else
            unexpectedNotificationWarning();
    } else
        unexpectedNotificationWarning();


    function unexpectedNotificationWarning() {
        logger.warn('notification received: un-subscribe from internal message ' + message
                     + ' without previous subscription notification');
    }
}


/**
 * MessengerAPI instance method
 * Returns the array of internal messages that were translated to given `sourceMessage`.
 * This method is used by `MessageSource` to dispatch source message on the `Mesenger`.
 *
 * @param {String} sourceMessage source message
 * @return {Array[String]}
 */
function getInternalMessages(sourceMessage) {
    return this._internalMessages[sourceMessage];
}


/**
 * MessengerAPI instance method
 * Subclasses should re-implement this method to define the rule for translation of internal `message` to source message. This class simply returns the same `message`.
 *
 * @param {String} message internal message to be translated
 * @return {String}
 */
function translateToSourceMessage(message) {
    return message
}


/**
 * MessengerAPI instance method
 * Subclasses should re-implement this method to define the rule for translation of source message data to internal message data. This class simply returns the same `sourceData`.
 * This method is used in [dispatchMessage](./m_source.js.html#dispatchMessage) method of `MessageSource`.
 *
 * @param {String} sourceMessage source message, can be used in translation rule
 * @param {String} message internal message, can be used in translation rule
 * @param {Object} sourceData data received from source that has to be translated to data that will be sent to internal Messenger subscriber
 * @return {Object}
 */
function createInternalData(sourceMessage, message, sourceData) {
    return sourceData;
}


/**
 * MessengerAPI instance method
 * Subclasses should re-implement this method to define the dispatch filter for internal messages. This method should return `true` to allow and `false` to prevent internal message dispatch. This class always returns `true`.
 * This method is used in [dispatchMessage](./m_source.js.html#dispatchMessage) method of `MessageSource`.
 *
 * @param {String} sourceMessage source message, can be used in filter rule
 * @param {String} message internal message, can be used in filter rule
 * @param {Object} internalData data translated by `createInternalData` method from source data, can be used in filter rule
 * @return {Boolean}
 */
function filterSourceMessage(sourceMessage, message, internalData) {
    return true;
}

},{"../util/logger":98,"mol-proto":109}],71:[function(require,module,exports){
'use strict';

var MessengerAPI = require('./m_api')
    , _ = require('mol-proto');


/**
 * A generic subsclass of [MessengerAPI](./m_api.js.html) that supports pattern subscriptions to source.
 * Can be useful if the source is another Messenger.
 */
 var MessengerRegexpAPI = _.createSubclass(MessengerAPI, 'MessengerRegexpAPI');

 module.exports = MessengerRegexpAPI;


_.extendProto(MessengerRegexpAPI, {
    init: init,
    addInternalMessage: addInternalMessage,
    removeInternalMessage: removeInternalMessage,
    getInternalMessages: getInternalMessages
});


/**
 * MessengerRegexpAPI instance method
 * Called by MessengerRegexpAPI constructor.
 */
function init() {
    MessengerAPI.prototype.init.apply(this, arguments);
    _.defineProperties(this, {
        _patternInternalMessages: {}
    });
    this._catchAllSubscribed = false;
}


/**
 * MessengerRegexpAPI instance method
 * Augments MessengerAPI method by storing regexp
 *
 * @param {String} message internal message to be translated and added
 * @return {String|RegExp|undefined}
 */
function addInternalMessage(message) {
    var sourceMessage = MessengerAPI.prototype.addInternalMessage.apply(this, arguments);
    
    // store regexp itself if sourceMessage is regexp
    if (sourceMessage && sourceMessage instanceof RegExp) {
        this._internalMessages[sourceMessage].pattern = sourceMessage;
        this._patternInternalMessages[sourceMessage] = this._internalMessages[sourceMessage];
        if (this._catchAllSubscribed) return;
            this._catchAllSubscribed = true;
        return /.*/;
    }

    return sourceMessage;
}


/**
 * MessengerRegexpAPI instance method
 * Augments MessengerAPI method by removing regexp subscirption
 * 
 * @param {String} message internal message to be translated and added
 * @return {String|RegExp|undefined}
 */
function removeInternalMessage(message) {
    var sourceMessage = MessengerAPI.prototype.removeInternalMessage.apply(this, arguments);

    if (sourceMessage && sourceMessage instanceof RegExp) {
        delete this._patternInternalMessages[sourceMessage];
        var noPatternInternalMessages = ! Object.keys(this._patternInternalMessages).length;
        if (noPatternInternalMessages) {
            this._catchAllSubscribed = false;
            return /.*/;
        }
    }

    return sourceMessage;
}


/**
 * MessengerAPI instance method
 * Augments MessengerAPI method by returning messages subscribed with regexp
 * This method is used by `MessageSource` to dispatch source message on the `Mesenger`.
 *
 * @param {String|RegExp} sourceMessage source message
 * @return {Array[String]}
 */
function getInternalMessages(sourceMessage) {
    var internalMessages = MessengerAPI.prototype.getInternalMessages.apply(this, arguments);

    // add internal messages for regexp source subscriptions
    if (typeof sourceMessage == 'string') {
        internalMessages = internalMessages || [];
        var internalMessagesHash = _.object(internalMessages, true);

        _.eachKey(this._patternInternalMessages, function(patternMessages) {
            var sourcePattern = patternMessages.pattern;

            if (sourcePattern.test(sourceMessage))
                patternMessages.forEach(function(message) {
                    if (internalMessagesHash[message]) return;
                    internalMessages.push(message);
                    internalMessagesHash[message] = true;
                });
        });
    } 

    return internalMessages;
}

},{"./m_api":70,"mol-proto":109}],72:[function(require,module,exports){
'use strict';

var Mixin = require('../abstract/mixin')
    , MessengerAPI = require('./m_api')
    , logger = require('../util/logger')
    , toBeImplemented = require('../util/error').toBeImplemented
    , _ = require('mol-proto')
    , check = require('../util/check')
    , Match = check.Match;


/**
 * `milo.classes.MessageSource`
 * An abstract class (subclass of [Mixin](../abstract/mixin.js.html)) for connecting [Messenger](./index.js.html) to external sources of messages (like DOM events) and defining higher level messages.
 * An instance of MessageSource can either be passed to Messenger constructor or later using `_setMessageSource` method of Messenger. Once set, MessageSource of Messenger cannot be changed.
 */
var MessageSource = _.createSubclass(Mixin, 'MessageSource', true);

module.exports = MessageSource;


/**
 * ####MessageSource instance methods####
 *
 * - [init](#init) - initializes messageSource - called by Mixin superclass
 * - [setMessenger](#setMessenger) - connects Messenger to MessageSource, is called from `init` or `_setMessageSource` methods of [Messenger](./index.js.html).
 * - [onSubscriberAdded](#onSubscriberAdded) - called by Messenger to notify when the first subscriber for an internal message was added, so MessageSource can subscribe to source
 * - [onSubscriberRemoved](#onSubscriberRemoved) - called by Messenger to notify when the last subscriber for an internal message was removed, so MessageSource can unsubscribe from source
 * - [dispatchMessage](#dispatchMessage) - dispatches source message. MessageSource subclass should implement mechanism when on actual source message this method is called.
 *
 * Methods below should be implemented in subclass:
 *
 * - [trigger](#trigger) - triggers messages on the source (an optional method)
 * - [addSourceSubscriber](#addSourceSubscriber) - adds listener/subscriber to external message
 * - [removeSourceSubscriber](#removeSourceSubscriber) - removes listener/subscriber from external message
 */
_.extendProto(MessageSource, {
    init: init,
    destroy: MessageSource$destroy,
    setMessenger: setMessenger,
    onSubscriberAdded: onSubscriberAdded,
    onSubscriberRemoved: onSubscriberRemoved, 
    dispatchMessage: dispatchMessage,
    postMessage: postMessage,
    _prepareMessengerAPI: _prepareMessengerAPI,

    // Methods below must be implemented in subclass
    trigger: toBeImplemented,
    addSourceSubscriber: toBeImplemented,
    removeSourceSubscriber: toBeImplemented
});


/**
 * MessageSource instance method.
 * Called by Mixin constructor.
 * MessageSource constructor should be passed the same parameters as this method signature.
 * If an instance of [MessengerAPI](./m_api.js.html) is passed as the third parameter, it extends MessageSource functionality to allow it to define new messages, to filter messages based on their data and to change message data. See [MessengerAPI](./m_api.js.html).
 *
 * @param {Object} hostObject Optional object that stores the MessageSource on one of its properties. It is used to proxy methods of MessageSource.
 * @param {Object[String]} proxyMethods Optional map of method names; key - proxy method name, value - MessageSource's method name.
 * @param {MessengerAPI} messengerAPI Optional instance of MessengerAPI.
 */
function init(hostObject, proxyMethods, messengerAPI) {
    this._prepareMessengerAPI(messengerAPI);
}


/**
 * Destroys message source
 */
function MessageSource$destroy() {
    if (this.messengerAPI)
        this.messengerAPI.destroy();
}


/**
 * MessageSource instance method.
 * Sets reference to Messenger instance.
 *
 * @param {Messenger} messenger reference to Messenger instance linked to this MessageSource
 */
function setMessenger(messenger) {
    _.defineProperty(this, 'messenger', messenger);
}


/**
 * MessageSource instance method.
 * Prepares [MessengerAPI](./m_api.js.html) passed to constructor by proxying its methods to itself or if MessengerAPI wasn't passed defines two methods to avoid checking their availability every time the message is dispatched.
 *
 * @private
 * @param {MessengerAPI} messengerAPI Optional instance of MessengerAPI
 */
function _prepareMessengerAPI(messengerAPI) {
    check(messengerAPI, Match.Optional(MessengerAPI));

    if (! messengerAPI)
        messengerAPI = new MessengerAPI;

    _.defineProperty(this, 'messengerAPI', messengerAPI);
}


/**
 * MessageSource instance method.
 * Subscribes to external source using `addSourceSubscriber` method that should be implemented in subclass.
 * This method is called by [Messenger](./index.js.html) when the first subscriber to the `message` is added.
 * Delegates to supplied or default [MessengerAPI](./m_api.js.html) for translation of `message` to `sourceMessage`. `MessageAPI.prototype.addInternalMessage` will return undefined if this `sourceMessage` was already subscribed to to prevent duplicate subscription.
 *
 * @param {String} message internal Messenger message that has to be subscribed to at the external source of messages.
 */
function onSubscriberAdded(message) {
    var newSourceMessage = this.messengerAPI.addInternalMessage(message);
    if (typeof newSourceMessage != 'undefined')
        this.addSourceSubscriber(newSourceMessage);
}


/**
 * MessageSource instance method.
 * Unsubscribes from external source using `removeSourceSubscriber` method that should be implemented in subclass.
 * This method is called by [Messenger](./index.js.html) when the last subscriber to the `message` is removed.
 * Delegates to supplied or default [MessengerAPI](./m_api.js.html) for translation of `message` to `sourceMessage`. `MessageAPI.prototype.removeInternalMessage` will return undefined if this `sourceMessage` was not yet subscribed to to prevent unsubscription without previous subscription.
 *
 * @param {String} message internal Messenger message that has to be unsubscribed from at the external source of messages.
 */
function onSubscriberRemoved(message) {
    var removedSourceMessage = this.messengerAPI.removeInternalMessage(message);
    if (typeof removedSourceMessage != 'undefined')
        this.removeSourceSubscriber(removedSourceMessage);
}


/**
 * MessageSource instance method.
 * Dispatches sourceMessage to Messenger.
 * Mechanism that calls this method when the source message is received should be implemented by subclass (see [DOMEventsSource](../components/msg_src/dom_events.js.html) for example).
 * Delegates to supplied or default [MessengerAPI](./m_api.js.html) to create internal message data (`createInternalData`) and to filter the message based on its data and/or message (`filterSourceMessage`).
 * Base MessengerAPI class implements these two methods in a trivial way (`createInternalData` simply returns external data, `filterSourceMessage` returns `true`), they are meant to be implemented by subclass.
 *
 * @param {String} sourceMessage source message received from external source
 * @param {Object} sourceData data received from external source
 */
function dispatchMessage(sourceMessage, sourceData) {
    var api = this.messengerAPI
        , internalMessages = api.getInternalMessages(sourceMessage);

    if (internalMessages) 
        internalMessages.forEach(function (message) {
            var internalData = api.createInternalData(sourceMessage, message, sourceData);

            var shouldDispatch = api.filterSourceMessage(sourceMessage, message, internalData);
            if (shouldDispatch) 
                this.postMessage(message, internalData);      
            
        }, this);
}


/**
 * Posts message on the messenger. This method is separated so specific message sources can make message dispatch synchronous by using `postMessageSync`
 * 
 * @param  {String} message
 * @param  {Object} data
 */
function postMessage(message, data) {
    this.messenger.postMessage(message, data);
}

},{"../abstract/mixin":3,"../util/check":88,"../util/error":94,"../util/logger":98,"./m_api":70,"mol-proto":109}],73:[function(require,module,exports){
'use strict';


var MessageSource = require('./m_source')
    , _ = require('mol-proto')
    , check = require('../util/check');


/**
 * Subclass of MessageSource that allows to connect Messenger to another Messenger using it as external source.
 */
var MessengerMessageSource = _.createSubclass(MessageSource, 'MessengerMessageSource');

module.exports = MessengerMessageSource;


/**
 * ####MessengerMessageSource instance methods####
 */
_.extendProto(MessengerMessageSource, {
    init: init,
    addSourceSubscriber: addSourceSubscriber,
    removeSourceSubscriber: removeSourceSubscriber,
    postMessage: MessengerMessageSource$postMessage
});

/**
 * Initializes MessengerMessageSource
 * Defines one parameter in addition to [MessageSource](./m_source.js.html) parameters
 *
 * @param {Messenger} sourceMessenger messenger this message source connects to
 */
function init(hostObject, proxyMethods, messengerAPI, sourceMessenger) {
    MessageSource.prototype.init.apply(this, arguments);
    this.sourceMessenger = sourceMessenger;
}


/**
 * Subscribes to source message. See [MessageSource](./m_source.js.html) docs.
 *
 * @param {String|Regex} sourceMessage source message to subscribe to
 */
function addSourceSubscriber(sourceMessage) {
    this.sourceMessenger.onSync(sourceMessage, { context: this, subscriber: this.dispatchMessage });
}


/**
 * Unsubscribes from source message. See [MessageSource](./m_source.js.html) docs.
 *
 * @param {String|Regex} sourceMessage source message to unsubscribe from
 */
function removeSourceSubscriber(sourceMessage) {
    this.sourceMessenger.off(sourceMessage, { context: this, subscriber: this.dispatchMessage });
}


/**
 * Overrides defalut message source to dispatch messages synchronously
 * 
 * @param {String} message
 * @param {Object} data
 */
function MessengerMessageSource$postMessage(message, data) {
    this.messenger.postMessageSync(message, data);
}


},{"../util/check":88,"./m_source":72,"mol-proto":109}],74:[function(require,module,exports){
'use strict';

var _ = require('mol-proto');


// register included facets
require('./use_facets');

// register included components
require('./use_components');


/**
 * `milo`
 *
 * A minimalist browser framework that binds DOM elements to JS components and components to models.
 *
 * `milo` is available as global object in the browser.
 * At the moment it is not possiible to require it with browserify to have it bundled with the app because of the way [brfs](https://github.com/substack/brfs) browserify plugin is implemented.
 * It is possible though to require `milo` with node to use universal parts of the framework (abstract classes, Messenger, Model, etc.):
 * ```
 * var milo = require('mol-milo');
 * ```
 * 
 * `milo` itself is a function that in the browser can be used to delay execution until DOM is ready.
 */
function milo(func) {
    milo.util.domReady(func);
}


/**
 * ####Milo packages####
 *
 * - [loader](./loader.js.html) - loading subviews into page
 * - [binder](./binder.js.html) - components instantiation and binding of DOM elements to them
 * - [minder](./minder.js.html) - data reactivity, one or two way, shallow or deep, as you like it
 * - [mail](./mail/index.js.html) - applicaiton level messenger, also connects to messages from other windows dispatched with `window.postMessage`.
 * - [config](./config.js.html) - milo configuration
 * - [util](./util/index.js.html) - logger, request, dom, check, error, etc.
 * - [classes](./classes.js.html) - abstract and base classes
 * - [attributes](./attributes/index.js.html) - classes that wrap DOM elements attributes recognized by milo
 * - [ComponentFacet](./components/c_facet.js.html) - base class of Component facet
 * - [Component](./components/c_class.js.html) - base Component class
 * - [Messenger](./messenger/index.js.html) - generic Messenger used in most other milo classes, can be mixed into app classes too.
 * - [Model](./model/index.js.html) - Model class that emits messages on changes to any depth without timer based watching
 * - [registry](./registry.js.html) - registries of fasets and components classes
 */
_.extend(milo, {
    loader: require('./loader'),
    binder: require('./binder'),
    minder: require('./minder'),
    mail: require('./mail'),
    config: require('./config'),
    util: require('./util'),
    classes: require('./classes'),
    attributes: require('./attributes'),
    ComponentFacet: require('./components/c_facet'),
    Component: require('./components/c_class'),
    Messenger: require('./messenger'),
    Model: require('./model'),
    Command: require('./command'),
    registry: require('./registry'),
    milo_version: '0.1'
});


// export for node/browserify
if (typeof module == 'object' && module.exports)    
    module.exports = milo;

// global milo for browser
if (typeof window == 'object') {
    window.milo = milo;
    milo.mail.trigger('miloready');
}

},{"./attributes":8,"./binder":9,"./classes":10,"./command":13,"./components/c_class":16,"./components/c_facet":17,"./config":64,"./loader":65,"./mail":66,"./messenger":69,"./minder":75,"./model":78,"./registry":85,"./use_components":86,"./use_facets":87,"./util":96,"mol-proto":109}],75:[function(require,module,exports){
'use strict';

var Connector = require('./model/connector')
    , Messenger = require('./messenger')
    , _ = require('mol-proto')
    , logger = require('./util/logger');


module.exports = minder;


/**
 * This function creates one or many Connector objects that
 * create live reactive connection between objects implementing
 * dataSource interface:
 * Objects should emit messages when any part of their data changes,
 * methods `on` and `off` should be implemented to subscribe/unsubscribe
 * to change notification messages, methods `set` and `get` should be implemented to get/set data
 * on path objects, pointing to particular parts of the object, method `path`
 * should return path object for a given path string (see path utils for path string syntax).
 * Both Model and Data facet are such data sources, they can be linked by Connector object.
 *
 * @param {Object} ds1 the first data source. Instead of the first data source an array can be passed with arrays of Connection objects parameters in each array element.
 * @param {String} mode the connection mode that defines the direction and the depth of connection. Possible values are '->', '<<-', '<<<->>>', etc.
 * @param {Object} ds2 the second data source
 * @param {Object} options not implemented yet
 */
function minder(ds1, mode, ds2, options) {
    if (Array.isArray(ds1)) {
        var connDescriptions = ds1;
        var connectors = connDescriptions.map(function(descr) {
            return new Connector(descr[0], descr[1], descr[2], descr[3]);
        });
        connectors.forEach(_addConnector);
        return connectors;
    } else {
        var cnct = new Connector(ds1, mode, ds2, options);
        _addConnector(cnct);
        return cnct;
    }
}


/**
 * messenger of minder where it emits events related to all connectors
 * @type {Messenger}
 */
var _messenger = new Messenger(minder, Messenger.defaultMethods);


var _connectors = []
    , _receivedMessages = []
    , _idleCheckDeferred = false;


_.extend(minder, {
    getConnectors: minder_getConnectors,
    getExpandedConnections: minder_getExpandedConnections,
    destroyConnector: minder_destroyConnector
});


function _addConnector(cnct) {
    cnct.___minder_id = _connectors.push(cnct) - 1;
    cnct.on(/.*/, onConnectorMessage);
    minder.postMessage('added', { connector: cnct });
    minder.postMessage('turnedon', { connector: cnct });
}


function onConnectorMessage(msg, data) {
    var data = data ? _.clone(data) : {};
    _.extend(data, {
        id: this.___minder_id,
        connector: this
    });
    minder.postMessage(msg, data);
    if (! _receivedMessages.length && ! _idleCheckDeferred) {
        _.defer(_idleCheck);
        _idleCheckDeferred = true;
    }

    _receivedMessages.push({ msg: msg, data: data });
}


function _idleCheck() {
    if (_receivedMessages.length) {
        _receivedMessages.length = 0;
        _.defer(_idleCheck);
        minder.postMessage('propagationticked');
    } else {
        _idleCheckDeferred = false;
        minder.postMessage('propagationcompleted');
    }
}


function minder_getConnectors(onOff) {
    if (typeof onOff == 'undefined')
        return _connectors;

    return _connectors.filter(function(cnct) {
        return cnct.isOn === onOff;
    });
}


function minder_destroyConnector(cnct) {
    cnct.destroy();
    var index = _connectors.indexOf(cnct);
    if (index >= 0)
        delete _connectors[index];
    else
        logger.warn('minder: connector destroyed that is not registered in minder');
}


function minder_getExpandedConnections(onOff, searchStr) {
    var connectors = minder.getConnectors(onOff);
    var connections =  connectors.map(function(cnct) {
        var connection = {
            leftSource: _getExpandedSource(cnct.ds1),
            rightSource: _getExpandedSource(cnct.ds2),
            mode: cnct.mode,
            isOn: cnct.isOn
        };
        
        if (cnct.options)
            connection.options = cnct.options;

        return connection;
    });

    if (searchStr)
        connections = connections.filter(function(cnctn) {
            return _sourceMatchesString(cnctn.leftSource, searchStr)
                    || _sourceMatchesString(cnctn.rightSource, searchStr);
        });

    return connections;
}


function _getExpandedSource(ds) {
    var source = [];
    if (typeof ds == 'function') {
        if (ds._model && ds._accessPath) {
            source.unshift(ds._accessPath);
            ds = ds._model;
        }

        source.unshift(ds);
        ds = ds._hostObject;
    }

    if (typeof ds == 'object') {
        source.unshift(ds);

        if (ds.owner)
            source.unshift(ds.owner);
    }

    return source;
}


function _sourceMatchesString(source, matchStr) {
    return source.some(function(srcNode) {
        var className = srcNode.constructor && srcNode.constructor.name;
        return _stringMatch(className, matchStr)
                || _stringMatch(srcNode.name, matchStr)
                || _stringMatch(srcNode, matchStr);
    });
}


function _stringMatch(str, substr) {
    return str && typeof str == 'string' && str.indexOf(substr) >= 0;
}

},{"./messenger":69,"./model/connector":77,"./util/logger":98,"mol-proto":109}],76:[function(require,module,exports){
'use strict';


var facetsRegistry = require('../components/c_facets/cf_registry')
    , logger = require('../util/logger')
    , config = require('../config')
    , pathUtils = require('./path_utils')
    , _ = require('mol-proto');

/**
 * Utility function to process "changedata" messages emitted by Connector object.
 */
module.exports = changeDataHandler;


_.extend(changeDataHandler, {
    setTransactionFlag: setTransactionFlag,
    getTransactionFlag: getTransactionFlag,
    passTransactionFlag: passTransactionFlag,
    postTransactionFinished: postTransactionFinished
});


/**
 * Change data uses hidden property on accessor methods to pass flag that the accessor is executed as a part of change transaction.
 * Accessor methods are supposed to store this flag in a local variable and to clear it (because another accessor can be executed in or out of transaction) using `getTransactionFlag`
 *
 * @private
 * @param {Function} func accessor method reference
 * @param {Boolean} flag a flag to be set
 */
function setTransactionFlag(func, flag) {
    _.defineProperty(func, '__inChangeTransaction', flag, _.CONF | _.WRIT);
}


/**
 * Retrieves and clears transaction flag from accessor method
 *
 * @private
 * @param {Function} func accessor method reference
 * @return {Boolean}
 */
function getTransactionFlag(func) {
    var inTransaction = func.__inChangeTransaction;
    delete func.__inChangeTransaction;
    return inTransaction;
}


function passTransactionFlag(fromFunc, toFunc) {
    var inTransaction = getTransactionFlag(fromFunc);
    setTransactionFlag(toFunc, inTransaction);
    return inTransaction;
}


/**
 * Posts message on this to indicate the end of transaction unless `inChangeTransaction` is `true`.
 */
function postTransactionFinished() {
    this.postMessageSync('datachanges', { transaction: false, changes: [] });
}


/**
 * subscriber to "changedata" event emitted by [Connector](./connector.js.html) object to enable reactive connections
 * Used by Data facet, Model and ModelPath. Can be used by any object that implements get/set/del/splice api and sets data deeply to the whole tree.
 * Object should call `changeDataHandler.initialize.call(this)` in its constructor.
 * TODO: optimize messages list to avoid setting duplicate values down the tree
 *
 * @param {String} msg should be "changedata" here
 * @param {Object} data batch of data change desciption objects
 * @param {Function} callback callback to call before and after the data is processed
 */
function changeDataHandler(message, data, callback) {
    processChanges.call(this, data.changes, callback);
}


// map of message types to methods
var CHANGE_TYPE_TO_METHOD_MAP = {
    'added':   'set',
    'changed': 'set',
    'deleted': 'del',
    'removed': 'del'
};


/**
 * Processes queued "changedata" messages.
 * Posts "changestarted" and "changecompleted" messages and calls callback
 *
 * @param {[Function]} callback optional callback that is called with `(null, false)` parameters before change processing starts and `(null, true)` after it's finished.
 */
function processChanges(transaction, callback) {
    notify.call(this, callback, false);
    processTransaction.call(this,
        prepareTransaction(
            validateTransaction(transaction)));
    notify.call(this, callback, true);
}


function notify(callback, changeFinished) {
    callback && callback(null, changeFinished);
    this.postMessage(changeFinished ? 'changecompleted' : 'changestarted');
}


/**
 * Checks that all messages from the transaction come from the same source.
 * Hack: reverses the transaction if it comes from the Data facet
 * Returns the reference to the transaction (for chaining)
 * 
 * @param  {Array} transaction transaction of data changes
 * @return {Array} 
 */
function validateTransaction(transaction) {
    var source = transaction[0].source
        , sameSource = true;

    if (transaction.length > 1) {
        for (var i = 1, len = transaction.length; i < len; i++)
            if (transaction[i].source != source) {
                logger.error('changedata: changes from different sources in the same transaction, sources:', transaction[i].source.name, source.name);
                sameSource = false;
                source = transaction[i].source;
            }
    }

    return transaction;
}


function prepareTransaction(transaction) {
    var todo = []
        , pathsToSplice = []
        , pathsToChange = []
        , hadSplice
        , exitLoop = {};


    try { transaction.forEach(checkChange); }
    catch (e) { if (e != exitLoop) throw e; }

    return todo;


    function checkChange(data) {
        (data.type == 'splice' ? checkSplice : checkMethod)(data);
    }


    function checkSplice(data) {
        var parsedPath = pathUtils.parseAccessPath(data.path);
        var parentPathChanged = pathsToChange.some(function(parentPath) {
            if (parsedPath.length <= parentPath.length) return;
            return _pathIsParentOf(parentPath, parsedPath);
        });

        if (parentPathChanged) return;

        todo.push(data);

        if (! config.debug) throw exitLoop;
        pathsToSplice.push(parsedPath);
        hadSplice = true;
    }


    function checkMethod(data) {
        var parsedPath = pathUtils.parseAccessPath(data.path);
        var parentPathSpliced = pathsToSplice && pathsToSplice.some(function(parentPath) {
            if (parsedPath.length <= parentPath.length
                || parsedPath[parentPath.length].syntax != 'array') return;
            return _pathIsParentOf(parentPath, parsedPath);
        });

        if (parentPathSpliced) return;
        if (hadSplice) logger.error('changedata: child change is executed after splice; probably data source did not emit message with data.type=="finished"');

        var parentPathChanged = pathsToChange.some(function(parentPath) {
            if (parsedPath.length <= parentPath.length) return;
            return _pathIsParentOf(parentPath, parsedPath);
        });

        if (parentPathChanged) return;

        pathsToChange.push(parsedPath);

        todo.push(data);
    }


    function _pathIsParentOf(parentPath, childPath) {
        return parentPath.every(function(pathNode, index) {
            return pathNode.property == childPath[index].property;
        });
    }
}


function processTransaction(transaction) {
    transaction.forEach(processChange, this);
    postTransactionFinished.call(this, false);

    function processChange(data) {
        var modelPath = this.path(data.path, data.type != 'removed' && data.type != 'deleted');
        if (! modelPath) return;
        (data.type == 'splice' ? executeSplice : executeMethod)(modelPath, data);
    }
}


function executeSplice(modelPath, data) {
    var index = data.index
        , howMany = data.removed.length
        , spliceArgs = [index, howMany];

    spliceArgs = spliceArgs.concat(data.newValue.slice(index, index + data.addedCount));
    setTransactionFlag(modelPath.splice, true);
    modelPath.splice.apply(modelPath, spliceArgs);
}


function executeMethod(modelPath, data) {
    var methodName = CHANGE_TYPE_TO_METHOD_MAP[data.type];
    if (methodName) {
        setTransactionFlag(modelPath[methodName], true);
        modelPath[methodName](data.newValue);
    } else
        logger.error('unknown data change type');
}

},{"../components/c_facets/cf_registry":31,"../config":64,"../util/logger":98,"./path_utils":83,"mol-proto":109}],77:[function(require,module,exports){
'use strict';

var ConnectorError = require('../util/error').Connector
    , Messenger = require('../messenger')
    , pathUtils = require('./path_utils')
    , _ = require('mol-proto')
    , logger = require('../util/logger');


module.exports = Connector;


var modePattern = /^(\<*)\-+(\>*)$/;


/**
 * Connector
 * Class that creates connector object for data connection between
 * two data-sources
 * Data-sources should implement the following API:
 * get() - get value from datasource or its path
 * set(value) - set value to datasource or to its path
 * on(path, subscriber) - subscription to data changes with "*" support
 * off(path, subscriber)
 * path(accessPath) - to return the object that gives reference to some part of datasource
 * and complies with that api too.
 *
 * ####Events####
 *
 * - 'turnedon' - connector was turned on
 * - 'turnedoff' - connector was turned off
 * - 'changestarted' - change on connected datasource is started
 * - 'changecompleted' - change on connected datasource is completed
 * - 'destroyed' - connector was destroyed
 * 
 * @param {Object} ds1 the first data source.
 * @param {String} mode the connection mode that defines the direction and the depth of connection. Possible values are '->', '<<-', '<<<->>>', etc.
 * @param {Object} ds2 the second data source
 * @param {Object} options not implemented yet
 * @return {Connector} when called with `new`, creates a Connector object.
 */
function Connector(ds1, mode, ds2, options) {
    setupMode.call(this, mode);

    _.extend(this, {
        ds1: ds1,
        ds2: ds2,
        isOn: false,
        _changesQueue1: [],
        _changesQueue2: [],
        _messenger: new Messenger(this, Messenger.defaultMethods)
    });

    if (options) {
        this.options = options;

        var pathTranslation = options.pathTranslation;
        if (pathTranslation) {
            pathTranslation = _.clone(pathTranslation);
            var patternTranslation = getPatternTranslations(pathTranslation);
            _.extend(this, {
                pathTranslation1: reverseTranslationRules(pathTranslation),
                pathTranslation2: pathTranslation,
                patternTranslation1: reversePatternTranslationRules(patternTranslation),
                patternTranslation2: patternTranslation
            });
        }

        var dataTranslation = options.dataTranslation;
        if (dataTranslation) {
            _.extend(this, {
                dataTranslation1: dataTranslation['<-'],
                dataTranslation2: dataTranslation['->']
            });
        }

        var dataValidation = options.dataValidation;
        if (dataValidation) {
            _.extend(this, {
                dataValidation1: dataValidation['<-'],
                dataValidation2: dataValidation['->']
            });
        }
    }

    this.turnOn();
}


function setupMode(mode){
    var parsedMode = mode.match(modePattern);

    if (! parsedMode)
        modeParseError();

    var depth1 = parsedMode[1].length
        , depth2 = parsedMode[2].length;

    if (depth1 && depth2 && depth1 != depth2)
        modeParseError();

    if (! depth1 && ! depth2)
        modeParseError();

    _.extend(this, {
        mode: mode,
        depth1: depth1,
        depth2: depth2,
    });

    function modeParseError() {
        throw new ConnectorError('invalid Connector mode: ' + mode);
    }
}


_.extendProto(Connector, {
    turnOn: Connector$turnOn,
    turnOff: Connector$turnOff,
    destroy: Connector$destroy,
    changeMode: Connector$changeMode,
    deferChangeMode: Connector$deferChangeMode
});

/**
 * Function change the mode of the connection
 *
 * @param @param {String} mode the connection mode that defines the direction and the depth of connection. Possible values are '->', '<<-', '<<<->>>', etc.
 * @return {Object[String]}
 */
function Connector$changeMode(mode) {
    this.turnOff();
    setupMode.call(this, mode);
    this.turnOn();
    return this;
}


/**
 * Function change the mode of the connection
 *
 * @param @param {String} mode the connection mode that defines the direction and the depth of connection. Possible values are '->', '<<-', '<<<->>>', etc.
 * @return {Object[String]}
 */
function Connector$deferChangeMode(mode) {
    _.deferMethod(this, 'changeMode', mode);
    return this;
}


/**
 * Function that reverses translation rules for paths of connected odata sources
 *
 * @param {Object[String]} rules map of paths defining the translation rules
 * @return {Object[String]}
 */
function reverseTranslationRules(rules) {
    var reverseRules = {};
    _.eachKey(rules, function(path2_value, path1_key) {
        reverseRules[path2_value] = path1_key;
    });
    return reverseRules;
}


function getPatternTranslations(pathTranslation) {
    var patternTranslation = [];
    _.eachKey(pathTranslation, function(path2_value, path1_key) {
        var starIndex1 = path1_key.indexOf('*')
            , starIndex2 = path2_value.indexOf('*');
        if (starIndex1 >= 0 && starIndex2 >= 0) { // pattern translation
            if (path1_key.slice(starIndex1) != path2_value.slice(starIndex2))
                _throwInvalidTranslation(path1_key, path2_value);
            delete pathTranslation[path1_key];            

            patternTranslation.push({
                fromPattern: pathUtils.createRegexPath(path1_key),
                fromStaticPath: _getStaticPath(path1_key, starIndex1),
                toPattern: pathUtils.createRegexPath(path2_value),
                toStaticPath: _getStaticPath(path2_value, starIndex2)
            });
        } else if (starIndex1 >= 0 || starIndex2 >= 0) // pattern only on one side of translation
            _throwInvalidTranslation(path1_key, path2_value);
    });

    return patternTranslation;


    function _throwInvalidTranslation(path1, path2) {
        throw new ConnectorError('Invalid pattern translation: ' + path1 + ', ' + path2);
    }


    function _getStaticPath(path, starIndex) {
        return path.replace(/[\.\[]?\*.*$/, '');
    }
}


function reversePatternTranslationRules(patternTranslation) {
    return patternTranslation.map(function(pt) {
        return {
            fromPattern: pt.toPattern,
            fromStaticPath: pt.toStaticPath,
            toPattern: pt.fromPattern,
            toStaticPath: pt.fromStaticPath
        };
    });
}


/**
 * turnOn
 * Method of Connector that enables connection (if it was previously disabled)
 */
function Connector$turnOn() {
    if (this.isOn)
        return logger.warn('data sources are already connected');

    var subscriptionPath = this._subscriptionPath =
        new Array(this.depth1 || this.depth2).join('*');

    var subscriptionPattern = pathUtils.createRegexPath(subscriptionPath);

    var self = this;
    if (this.depth1)
        this._link1 = linkDataSource('_link2', this.ds2, this.ds1, this._changesQueue1, this.pathTranslation1, this.patternTranslation1, this.dataTranslation1, this.dataValidation1);
    if (this.depth2)
        this._link2 = linkDataSource('_link1', this.ds1, this.ds2, this._changesQueue2, this.pathTranslation2, this.patternTranslation2, this.dataTranslation2, this.dataValidation2);

    this.isOn = true;
    this.postMessage('turnedon');


    function linkDataSource(reverseLink, fromDS, toDS, changesQueue, pathTranslation, patternTranslation, dataTranslation, dataValidation) {
        fromDS.onSync('datachanges', onData);
        return onData;

        function onData(message, batch) {
            var sendData = {
                changes: [],
                transaction: batch.transaction
            }

            batch.changes.forEach(function(change) {
                var sourcePath = change.path
                    , targetPath = translatePath(sourcePath);

                if (typeof targetPath == 'undefined') return;

                var change = _.clone(change);
                _.extend(change, {
                    source: fromDS,
                    path: targetPath
                });

                translateData(sourcePath, change);
                validateData(sourcePath, change);
            });

            if (! changesQueue.length)
                _.defer(postChangeData);

            changesQueue.push(sendData);


            function translatePath(sourcePath) {
                if (pathTranslation) {
                    var translatedPath = pathTranslation[sourcePath];
                    if (translatedPath) return translatedPath;
                    if (!patternTranslation.length) return;
                    var pt = _.find(patternTranslation, function(pTranslation) {
                        return pTranslation.fromPattern.test(sourcePath);
                    });
                    if (!pt) return;
                    var translatedPath = sourcePath.replace(pt.fromStaticPath, pt.toStaticPath);
                } else if (! ((subscriptionPattern instanceof RegExp
                                 && subscriptionPattern.test(sourcePath))
                              || subscriptionPattern == sourcePath)) return;

                return translatedPath || sourcePath;
            }


            function translateData(sourcePath, change) {
                if (dataTranslation) {
                    var translate = dataTranslation[sourcePath];
                    if (translate && typeof translate == 'function') {
                        change.oldValue = translate(change.oldValue);
                        change.newValue = translate(change.newValue);
                    }
                }
            }

             
            function validateData(sourcePath, change) {
                propagateData(change);

                if (dataValidation) {
                    var validators = dataValidation[sourcePath]
                        , passedCount = 0
                        , alreadyFailed = false;

                    if (validators)
                        validators.forEach(callValidator);   
                }


                function callValidator(validator) {
                    validator(change.newValue, function(err, response) {
                        response.path = sourcePath;
                        if (! alreadyFailed && (err || response.valid) && ++passedCount == validators.length) {
                            fromDS.postMessage('validated', response);
                        } else if (! response.valid) {
                            alreadyFailed = true;
                            fromDS.postMessage('validated', response);
                        }
                    });
                }
            }


            function propagateData(change) {
                sendData.changes.push(change);
            }


            function postChangeData() {
                // prevent endless loop of updates for 2-way connection
                if (self[reverseLink]) var callback = subscriptionSwitch;

                var transactions = mergeTransactions(changesQueue);
                changesQueue.length = 0;
                transactions.forEach(function(transaction) {
                    // send data change instruction as message
                    toDS.postMessageSync('changedata', { changes: transaction }, callback);
                });
            }


            function subscriptionSwitch(err, changeFinished) {
                if (err) return;
                var onOff = changeFinished ? 'onSync' : 'off';
                toDS[onOff]('datachanges', self[reverseLink]);

                var message = changeFinished ? 'changecompleted' : 'changestarted';
                self.postMessage(message, { source: fromDS, target: toDS });
            }


            function mergeTransactions(batches) {
                var transactions = []
                    , currentTransaction;

                batches.forEach(function(batch) {
                    if (! batch.transaction) currentTransaction = undefined;
                    if (! batch.changes.length) return;

                    if (batch.transaction) {
                        if (currentTransaction)
                            _.appendArray(currentTransaction, batch.changes);
                        else {
                            currentTransaction = _.clone(batch.changes);
                            transactions.push(currentTransaction);
                        }
                    } else
                        transactions.push(batch.changes);
                });

                return transactions;
            }
        }
    }
}


/**
 * turnOff
 * Method of Connector that disables connection (if it was previously enabled)
 */
function Connector$turnOff() {
    if (! this.isOn)
        return logger.warn('data sources are already disconnected');

    var self = this;
    unlinkDataSource(this.ds1, '_link2', this.pathTranslation2);
    unlinkDataSource(this.ds2, '_link1', this.pathTranslation1);

    this.isOn = false;
    this.postMessage('turnedoff');


    function unlinkDataSource(fromDS, linkName, pathTranslation) {
        if (self[linkName]) {
            fromDS.off('datachanges', self[linkName]);
            delete self[linkName];
        }
    }
}


/**
 * Destroys connector object by turning it off and removing references to connected sources
 */
function Connector$destroy() {
    this.turnOff();
    this.postMessage('destroyed');
    this._messenger.destroy();
    delete this.ds1;
    delete this.ds2;
}

},{"../messenger":69,"../util/error":94,"../util/logger":98,"./path_utils":83,"mol-proto":109}],78:[function(require,module,exports){
'use strict';

var ModelPath = require('./m_path')
    , synthesize = require('./synthesize')
    , pathUtils = require('./path_utils')
    , changeDataHandler = require('./change_data')
    , Messenger = require('../messenger')
    , MessengerMessageSource = require('../messenger/msngr_source')
    , ModelMsgAPI = require('./m_msg_api')
    , ModelError = require('../util/error').Model
    , Mixin = require('../abstract/mixin')
    , _ = require('mol-proto')
    , check = require('../util/check')
    , Match = check.Match
    , logger = require('../util/logger')
    , jsonParse = require('../util/json_parse');


module.exports = Model;


/**
 * `milo.Model`
 * Model class instantiates objects that allow deep data access with __safe getters__ that return undefined (rather than throwing exception) when properties/items of unexisting objects/arrays are requested and __safe setters__ that create object trees when properties/items of unexisting objects/arrays are set and also post messages to allow subscription on changes and enable data reactivity.
 * Reactivity is implememnted via [Connector](./connector.js.html) that can be instantiated either directly or with more convenient interface of [milo.minder](../minder.js.html). At the moment model can be connected to [Data facet](../components/c_facets/Data.js.html) or to another model or [ModelPath](./m_path.js.html).
 * Model constructor returns objects that are functions at the same time; when called they return ModelPath objects that allow get/set access to any point in model data. See [ModelData](#ModelData) below.
 *
 * You can subscribe to model changes with `on` method by passing model access path in place of message, pattern or string with any number of stars to subscribe to a certain depth in model (e.g., `'***'` to subscribe to three levels).
 * 
 * @constructor
 * @param {Object|Array} data optional initial array data. If it is planned to connect model to view it is usually better to instantiate an empty Model (`var m = new Model`), connect it to [Component](../components/c_class.js.html)'s [Data facet](../components/c_facets/Data.js.html) (e.g., `milo.minder(m, '<<->>', c.data);`) and then set the model with `m.set(data)` - the view will be automatically updated.
 * @param {Object} hostObject optional object that hosts model on one of its properties. Can be used when model itself is the context of the message subscriber and you need to travers to this object (although it is possible to set any context). Can also be used to proxy model's methods to the host like [Model facet](../components/c_facets/ModelFacet.js.html) is doing.
 * @return {Model}
 */
function Model(data, hostObject) {
    // `model` will be returned by constructor instead of `this`. `model`
    // (`modelPath` function) should return a ModelPath object with "synthesized" methods
    // to get/set model properties, to subscribe to property changes, etc.
    // Additional arguments of modelPath can be used in the path using interpolation - see ModelPath below.
    var model = function modelPath(accessPath) { // , ... arguments that will be interpolated
        return Model$path.apply(model, arguments);
    };
    model.__proto__ = Model.prototype;

    _.defineProperties(model, {
        _hostObject: hostObject
    });

    model._prepareMessengers();

    if (data) model._data = data;

    // subscribe to "changedata" message to enable reactive connections
    model.onSync('changedata', changeDataHandler);

    return model;
}

Model.prototype.__proto__ = Model.__proto__;


/** 
 * ####Model instance methods####
 *
 * - [path](#path) - returns ModelPath object that allows access to any point in Model
 * - [get](#Model$get) - get model data
 * - set - set model data, synthesized
 * - splice - splice model data (as array or pseudo-array), synthesized
 * - [len](./m_path.js.html#ModelPath$len) - returns length of array (or pseudo-array) in model in safe way, 0 if no length is set
 * - [push](./m_path.js.html#ModelPath$push) - add items to the end of array (or pseudo-array) in model
 * - [pop](./m_path.js.html#ModelPath$pop) - remove item from the end of array (or pseudo-array) in model
 * - [unshift](./m_path.js.html#ModelPath$unshift) - add items to the beginning of array (or pseudo-array) in model
 * - [shift](./m_path.js.html#ModelPath$shift) - remove item from the beginning of array (or pseudo-array) in model
 * - [proxyMessenger](#proxyMessenger) - proxy model's Messenger methods to host object
 * - [proxyMethods](#proxyMethods) - proxy model methods to host object
 */
_.extendProto(Model, {
    path: Model$path,
    get: Model$get,
    proxyMessenger: proxyMessenger,
    proxyMethods: proxyMethods,
    _prepareMessengers: _prepareMessengers,
    _getHostObject: _getHostObject
});

// set, del, splice are added to model
_.extendProto(Model, synthesize.modelMethods);


/**
 * - Path: ModelPath class as `milo.Model.Path`
 * - [registerWithDOMStorage](#Model$$registerWithDOMStorage)
 */
_.extend(Model, {
    Path: ModelPath,
    registerWithDOMStorage: Model$$registerWithDOMStorage
});


/**
 * ModelPath methods added to Model prototype
 */
['len', 'push', 'pop', 'unshift', 'shift'].forEach(function(methodName) {
    var method = ModelPath.prototype[methodName];
    _.defineProperty(Model.prototype, methodName, method);
});


/**
 * Model instance method.
 * Get model data.
 *
 * @return {Any}
 */
function Model$get() {
    return this._data;
}


/**
 * Model instance method.
 * Returns ModelPath object that implements the same API as model but allows access to any point inside model as defined by `accessPath`.
 * See [ModelPath](./m_path.js.html) class for more information.
 * 
 * @param {String} accessPath string that defines path to access model.
 *  Path string consists of parts to define either property access (`".name"` to access property name) or array item access (`"[1]"` to access item with index 1).
 *  Access path can contain as many parts as necessary (e.g. `".list[0].name"` to access property `name` in the first element of array stored in property `list`.
 * @param {List} arguments additional arguments of this method can be used to create interpolated paths.
 *  E.g. `m.path("[$1].$2", id, prop)` returns ModelPath to access property with name `prop` in array item with index `id`. Although this ModelPath object will work exactly as `m("[" + id + "]." + prop)`, the interpolated is much more efficient as ModelPath with interpolation will not synthesize new getters and setters, while ModelPath with computed access path will synthesize new getters and setters for each pair of values of `id` and `prop`.
 * @return {ModelPath}
 */
function Model$path(accessPath) {  // , ... arguments that will be interpolated
    if (! accessPath) return this;

    // "null" is context to pass to ModelPath, first parameter of bind
    // "this" (model) is added in front of all arguments
    _.splice(arguments, 0, 0, null, this);

    // calling ModelPath constructor with new and the list of arguments: this (model), accessPath, ...
    return new (Function.prototype.bind.apply(ModelPath, arguments));
}


/**
 * Model instance method.
 * Proxy model's Messenger methods to host object.
 *
 * @param {Object} modelHostObject optional host object. If not passed, hostObject passed to Model constructor will be used.
 */
function proxyMessenger(modelHostObject) {
    modelHostObject = modelHostObject || this._hostObject;
    Mixin.prototype._createProxyMethods.call(this._messenger, messengerMethodsToProxy, modelHostObject);
}
var messengerMethodsToProxy = Messenger.defaultMethods;


/**
 * Model instance method.
 * Proxy model methods to host object.
 *
 * @param {Object} modelHostObject optional host object. If not passed, hostObject passed to Model constructor will be used.
 */
function proxyMethods(modelHostObject) {
    modelHostObject = modelHostObject || this._hostObject;
    Mixin.prototype._createProxyMethods.call(this, modelMethodsToProxy, modelHostObject);
}
var modelMethodsToProxy = ['path', 'get', 'set', 'del', 'splice', 'len', 'push', 'pop', 'unshift', 'shift'];


/**
 * Model instance method.
 * Create and connect internal and external model's messengers.
 * External messenger's methods are proxied on the model and they allows "*" subscriptions.
 */
function _prepareMessengers() {
    // model will post all its changes on internal messenger
    var internalMessenger = new Messenger(this, undefined, undefined);

    // message source to connect internal messenger to external
    var internalMessengerSource = new MessengerMessageSource(this, undefined, new ModelMsgAPI, internalMessenger);

    // external messenger to which all model users will subscribe,
    // that will allow "*" subscriptions and support "changedata" message api.
    var externalMessenger = new Messenger(this, Messenger.defaultMethods, internalMessengerSource);

    _.defineProperties(this, {
        _messenger: externalMessenger,
        _internalMessenger: internalMessenger
    });
}


function _getHostObject() {
    return this._hostObject;
}


function Model$$registerWithDOMStorage() {
    var DOMStorage = require('../util/storage');
    DOMStorage.registerDataType('Model', Model_domStorageSerializer, Model_domStorageParser);
    DOMStorage.registerDataType('ModelPath', Model_domStorageSerializer, Model_domStorageParser, 'Model');
}


function Model_domStorageSerializer(value) {
    var data = value.get();
    return JSON.stringify(data);
}


function Model_domStorageParser(valueStr) {
    var data = jsonParse(valueStr);
    return new Model(data);
}

},{"../abstract/mixin":3,"../messenger":69,"../messenger/msngr_source":73,"../util/check":88,"../util/error":94,"../util/json_parse":97,"../util/logger":98,"../util/storage":103,"./change_data":76,"./m_msg_api":79,"./m_path":80,"./path_utils":83,"./synthesize":84,"mol-proto":109}],79:[function(require,module,exports){
'use strict';

var MessengerRegexpAPI = require('../messenger/m_api_rx')
    , pathUtils = require('./path_utils')
    , _ = require('mol-proto');


/**
 * Subclass of MessengerRegexpAPI that is used to translate messages of external messenger of Model to internal messenger of Model.
 */
var ModelMsgAPI = _.createSubclass(MessengerRegexpAPI, 'ModelMsgAPI');

module.exports = ModelMsgAPI;


/**
 * ####ModelMsgAPI instance methods####
 *
 * - [translateToSourceMessage](#translateToSourceMessage) - translates subscription paths with "*"s to regex, leaving other strings untouched
 */
_.extendProto(ModelMsgAPI, {
    translateToSourceMessage: translateToSourceMessage,
});


/**
 * ModelMsgAPI instance method
 * Translates subscription paths with "*"s to regex, leaving other strings untouched.
 *
 * @param {String} accessPath relative access path to be translated
 * @return {RegExp|String}
 */
function translateToSourceMessage(accessPath) {
    if (accessPath instanceof RegExp) return accessPath;

    return pathUtils.createRegexPath(accessPath);
}

},{"../messenger/m_api_rx":71,"./path_utils":83,"mol-proto":109}],80:[function(require,module,exports){
'use strict';

var synthesize = require('./synthesize')
    , pathUtils = require('./path_utils')
    , changeDataHandler = require('./change_data')
    , Messenger = require('../messenger')
    , ModelPathMsgAPI = require('./path_msg_api')
    , MessengerMessageSource = require('../messenger/msngr_source')
    , _ = require('mol-proto')
    , check = require('../util/check')
    , Match = check.Match;


module.exports = ModelPath;


/**
 * `milo.Model.Path`
 * ModelPath object that allows access to any point inside [Model](./index.js.html) as defined by `accessPath`
 *
 * @constructor
 * @param {Model} model Model instance that ModelPath gives access to.
 * @param {String} accessPath string that defines path to access model.
 *  Path string consists of parts to define either property access (`".name"` to access property name) or array item access (`"[1]"` to access item with index 1).
 *  Access path can contain as many parts as necessary (e.g. `".list[0].name"` to access property `name` in the first element of array stored in property `list`.
 * @param {List} arguments additional arguments of this method can be used to create interpolated paths.
 *  E.g. `m.path("[$1].$2", id, prop)` returns ModelPath to access property with name `prop` in array item with index `id`. Although this ModelPath object will work exactly as `m("[" + id + "]." + prop)`, the interpolated is much more efficient as ModelPath with interpolation will not synthesize new getters and setters, while ModelPath with computed access path will synthesize new getters and setters for each pair of values of `id` and `prop`.
 * @return {ModelPath}
 */
function ModelPath(model, path) { // ,... - additional arguments for interpolation
    // check(model, Model);
    check(path, String);

    // `modelPath` will be returned by constructor instead of `this`. `modelPath`
    // (`modelPath_path` function) should also return a ModelPath object with "synthesized" methods
    // to get/set model properties, to subscribe to property changes, etc.
    // Additional arguments of modelPath can be used in the path using interpolation - see ModelPath below.
    var modelPath = function modelPath_path(accessPath) { // , ... arguments that will be interpolated
        return ModelPath$path.apply(modelPath, arguments);
    };
    modelPath.__proto__ = ModelPath.prototype;


    _.defineProperties(modelPath, {
        _model: model,
        _path: path,
        _args: _.slice(arguments, 1) // path will be the first element of this array
    });

    // parse access path
    var parsedPath = pathUtils.parseAccessPath(path);

    // compute access path string
    _.defineProperty(modelPath, '_accessPath', interpolateAccessPath(parsedPath, modelPath._args));

    // messenger fails on "*" subscriptions
    modelPath._prepareMessenger();

    // compiling getter and setter
    var methods = synthesize(path, parsedPath);

    // adding methods to model path
    _.defineProperties(modelPath, methods);

    // subscribe to "changedata" message to enable reactive connections
    modelPath.onSync('changedata', changeDataHandler);

    Object.freeze(modelPath);

    return modelPath;
}

ModelPath.prototype.__proto__ = ModelPath.__proto__;


/**
 * Interpolates path elements to compute real path
 *
 * @param {Array} parsedPath parsed path - array of path nodes
 * @param {Array} args path interpolation arguments, args[0] is path itself
 * @return {String}
 */
function interpolateAccessPath(parsedPath, args) {
    return parsedPath.reduce(function(accessPathStr, currNode, index) {
        var interpolate = currNode.interpolate;
        return accessPathStr + 
                (interpolate
                    ? (currNode.syntax == 'array'
                        ? '[' + args[interpolate] + ']'
                        : '.' + args[interpolate])
                    : currNode.property);
    }, '');
}


/**
 * ####ModelPath instance methods####
 * 
 * - [path](#ModelPath$path) - gives access to path inside ModelPath
 * - get - synthesized
 * - set - synthesized
 * - splice - splice model data (as array or pseudo-array), synthesized
 * - [len](#ModelPath$len) - returns length of array (or pseudo-array) in safe way, 0 if no length is set
 * - [push](#ModelPath$push) - add items to the end of array (or pseudo-array) in ModelPath
 * - [pop](#ModelPath$pop) - remove item from the end of array (or pseudo-array) in ModelPath
 * - [unshift](#ModelPath$unshift) - add items to the beginning of array (or pseudo-array) in ModelPath
 * - [shift](#ModelPath$shift) - remove item from the beginning of array (or pseudo-array) in ModelPath
 */
_.extendProto(ModelPath, {
    path: ModelPath$path,
    len: ModelPath$len,
    push: ModelPath$push,
    pop: ModelPath$pop,
    unshift: ModelPath$unshift,
    shift: ModelPath$shift,
    _prepareMessenger: _prepareMessenger,
    _getDefinition: _getDefinition
});


_.extend(ModelPath, {
    _createFromDefinition: _createFromDefinition
})


/**
 * ModelPath instance method
 * Gives access to path inside ModelPath. Method works similarly to [path method](#Model$path) of model, using relative paths.
 * 
 * @param {String} accessPath string that defines path to access model.
 *  Path string consists of parts to define either property access (`".name"` to access property name) or array item access (`"[1]"` to access item with index 1).
 *  Access path can contain as many parts as necessary (e.g. `".list[0].name"` to access property `name` in the first element of array stored in property `list`.
 * @param {List} arguments additional arguments of this method can be used to create interpolated paths.
 *  E.g. `m.path("[$1].$2", id, prop)` returns ModelPath to access property with name `prop` in array item with index `id`. Although this ModelPath object will work exactly as `m("[" + id + "]." + prop)`, the interpolated is much more efficient as ModelPath with interpolation will not synthesize new getters and setters, while ModelPath with computed access path will synthesize new getters and setters for each pair of values of `id` and `prop`.
 * @return {ModelPath}
 */
function ModelPath$path(accessPath) {  // , ... arguments that will be interpolated
    if (! accessPath) return this;

    var thisPathArgsCount = this._args.length - 1;

    if (thisPathArgsCount > 0) {// this path has interpolated arguments too
        accessPath = accessPath.replace(/\$[1-9][0-9]*/g, function(str) {
            return '$' + (+str.slice(1) + thisPathArgsCount);
        });
    }

    var newPath = this._path + accessPath;

    // this._model is added in front of all arguments as the first parameter
    // of ModelPath constructor
    var args = [this._model, newPath]
                .concat(this._args.slice(1)) // remove old path from _args, as it is 1 based
                .concat(_.slice(arguments, 1)); // add new interpolation arguments

    // calling ModelPath constructor with new and the list of arguments: this (model), accessPath, ...
    return _.newApply(ModelPath, args);
}


/**
 * ModelPath and Model instance method
 * Returns length property and sets it to 0 if it wasn't set.
 *
 * @return {Any}
 */
function ModelPath$len() {
    return this.path('.length').get() || 0;
}


/**
 * ModelPath and Model instance method
 * Adds items to the end of array (or pseudo-array). Returns new length.
 *
 * @param {List} arguments list of items that will be added to array (pseudo array)
 * @return {Integer}
 */
function ModelPath$push() { // arguments
    var length = this.len();
    var newLength = length + arguments.length;

    _.splice(arguments, 0, 0, length, 0);
    this.splice.apply(this, arguments);

    return newLength;
}


/**
 * ModelPath and Model instance method
 * Removes item from the end of array (or pseudo-array). Returns this item.
 *
 * @return {Any}
 */
function ModelPath$pop() {
    return this.splice(this.len() - 1, 1)[0];
}


/**
 * ModelPath and Model instance method
 * Inserts items to the beginning of the array. Returns new length.
 *
 * @param {List} arguments items to be inserted in the beginning of array
 * @return {Integer}
 */
function ModelPath$unshift() { // arguments
    var length = this.len();
    length += arguments.length;

    _.splice(arguments, 0, 0, 0, 0);
    this.splice.apply(this, arguments);

    return length;
}


/**
 * ModelPath and Model instance method
 * Removes the item from the beginning of array (or pseudo-array). Returns this item.
 *
 * @return {Any}
 */
function ModelPath$shift() { // arguments
    return this.splice(0, 1)[0];
}


/**
 * ModelPath instance method
 * Initializes ModelPath mesenger with Model's messenger as its source ([MessengerMessageSource](../messenger/msngr_source.js.html)) and [ModelPathMsgAPI](./path_msg_api.js.html) as [MessengerAPI](../messenger/m_api.js.html)
 */
function _prepareMessenger() {
    var mPathAPI = new ModelPathMsgAPI(this._accessPath);

    // create MessengerMessageSource connected to Model's messenger
    var modelMessageSource = new MessengerMessageSource(this, undefined, mPathAPI, this._model);

    // create messenger with model passed as hostObject (default message dispatch context)
    // and without proxying methods (we don't want to proxy them to Model)
    var mPathMessenger = new Messenger(this, Messenger.defaultMethods, modelMessageSource);

    // store messenger on ModelPath instance
    _.defineProperty(this, '_messenger', mPathMessenger);
}


/**
 * Returns the object allowing to recreate model path
 * 
 * @return {Object}
 */
function _getDefinition() {
    return {
        model: this._model,
        path: this._path,
        args: this._args
    };
}


/**
 * Class method
 * Creates modelPath object from definition created by _getDefinition
 * 
 * @param  {Object} definition
 * @return {ModelPath}          
 */
function _createFromDefinition(definition) {
    check(definition, {
        model: Function, // Model
        path: String,
        args: Array
    });

    var m = definition.model;

    return m.apply(m, definition.args);
}

},{"../messenger":69,"../messenger/msngr_source":73,"../util/check":88,"./change_data":76,"./path_msg_api":82,"./path_utils":83,"./synthesize":84,"mol-proto":109}],81:[function(require,module,exports){
'use strict';


var modelUtils = {
    normalizeSpliceIndex: normalizeSpliceIndex
};

module.exports = modelUtils;


function normalizeSpliceIndex(spliceIndex, length) {
    return spliceIndex > length
            ? length
            : spliceIndex >= 0
                ? spliceIndex
                : spliceIndex + length > 0
                    ? spliceIndex + length
                    : 0;
}

},{}],82:[function(require,module,exports){
'use strict';

var MessengerAPI = require('../messenger/m_api')
    , pathUtils = require('./path_utils')
    , logger = require('../util/logger')
    , _ = require('mol-proto');


/**
 * Subclass of MessengerAPI that is used to translate messages of Messenger on ModelPath to Messenger on Model.
 */
var ModelPathMsgAPI = _.createSubclass(MessengerAPI, 'ModelPathMsgAPI');

module.exports = ModelPathMsgAPI;


/**
 * ####ModelPathMsgAPI instance methods####
 *
 * - [init](#init) - initializes ModelPathMsgAPI
 * - [translateToSourceMessage](#translateToSourceMessage) - translates relative access paths of ModelPath to full path of Model
 * - [createInternalData](#createInternalData) - changes path in message on model to relative path and adds `fullPath` property to message data
 */
_.extendProto(ModelPathMsgAPI, {
    init: init,
    translateToSourceMessage: translateToSourceMessage,
    createInternalData: createInternalData,
});


/**
 * ModelPathMsgAPI instance method
 * Called by MessengerAPI constructor.
 *
 * @param {String} rootPath root path of model path
 */
function init(rootPath) {
    MessengerAPI.prototype.init.apply(this, arguments);
    this.rootPath = rootPath;
}

/**
 * ModelPathMsgAPI instance method
 * Translates relative access paths of ModelPath to full path of Model.
 *
 * @param {String} accessPath relative access path to be translated
 * @return {String}
 */
function translateToSourceMessage(message) {
    // TODO should prepend RegExes
    // TODO should not prepend changedata too???
    if (message instanceof RegExp)
        return message;
    if (message == 'datachanges')
        return message;
    
    return this.rootPath + message;
}


/**
 * ModelPathMsgAPI instance method
 * Changes path in message on model to relative path and adds `fullPath` property to message data.
 *
 * @param {String} sourceMessage full access path on Model
 * @param {String} message relative access path on ModelPath
 * @param {Object} sourceData data received from Model, will be translated as described to be dispatched to ModelPath
 * @return {Object}
 */
function createInternalData(sourceMessage, message, sourceData) {
    // TODO return on changedata too???
    if (message == 'datachanges') {
        var internalChanges = sourceData.changes
            .map(truncateChangePath, this)
            .filter(function(change) { return change; });
        var internalData = {
            changes: internalChanges,
            transaction: sourceData.transaction
        };

        return internalData
    }

    var internalData = truncateChangePath.call(this, sourceData);
    return internalData;
}


function truncateChangePath(change) {
    var fullPath = change.path
        , path = _.unPrefix(fullPath, this.rootPath);

    if (typeof path == 'string') {
        var change = _.clone(change);
        change.fullPath = fullPath;
        change.path = path;
        return change;
    }
}

},{"../messenger/m_api":70,"../util/logger":98,"./path_utils":83,"mol-proto":109}],83:[function(require,module,exports){
'use strict';

// <a name="model-path"></a>
// ### model path utils

var check = require('../util/check')
    , Match = check.Match
    , _ = require('mol-proto')
    , ModelError = require('../util/error').Model;

var pathUtils = {
    parseAccessPath: parseAccessPath,
    createRegexPath: createRegexPath,
    getPathNodeKey: getPathNodeKey,
    wrapMessengerMethods: wrapMessengerMethods
};

module.exports = pathUtils;


var propertyPathSyntax = '\\.[A-Za-z][A-Za-z0-9_]*'
    , arrayPathSyntax = '\\[[0-9]+\\]'
    , interpolationSyntax = '\\$[1-9][0-9]*'
    , propertyInterpolateSyntax = '\\.' + interpolationSyntax
    , arrayInterpolateSyntax = '\\[' + interpolationSyntax + '\\]'

    , propertyStarSyntax = '\\.\\*'
    , arrayStarSyntax = '\\[\\*\\]'
    , starSyntax = '\\*'

    , pathParseSyntax = [
                            propertyPathSyntax,
                            arrayPathSyntax,
                            propertyInterpolateSyntax,
                            arrayInterpolateSyntax
                        ].join('|')
    , pathParsePattern = new RegExp(pathParseSyntax, 'g')

    , patternPathParseSyntax =  [
                                    pathParseSyntax,
                                    propertyStarSyntax,
                                    arrayStarSyntax,
                                    starSyntax
                                ].join('|')
    , patternPathParsePattern = new RegExp(patternPathParseSyntax, 'g')

    //, targetPathParsePattern = /\.[A-Za-z][A-Za-z0-9_]*|\[[0-9]+\]|\.\$[1-9][0-9]*|\[\$[1-9][0-9]*\]|\$[1-9][0-9]/g
    , pathNodeTypes = {
        '.': { syntax: 'object', empty: '{}' },
        '[': { syntax: 'array', empty: '[]'},
        '*': { syntax: 'match', empty: '{}'},
    };

function parseAccessPath(path, nodeParsePattern) {
    nodeParsePattern = nodeParsePattern || pathParsePattern;

    var parsedPath = [];

    if (! path)
        return parsedPath;

    var unparsed = path.replace(nodeParsePattern, function(nodeStr) {
        var pathNode = { property: nodeStr };
        _.extend(pathNode, pathNodeTypes[nodeStr[0]]);
        if (nodeStr[1] == '$')
            pathNode.interpolate = getPathNodeKey(pathNode, true);

        parsedPath.push(pathNode);
        return '';
    });
    if (unparsed)
        throw new ModelError('incorrect model path: ' + path);

    return parsedPath;
}


var nodeRegex = {
    '.*': propertyPathSyntax,
    '[*]': arrayPathSyntax
};
nodeRegex['*'] = nodeRegex['.*'] + '|' + nodeRegex['[*]'];

function createRegexPath(path) {
    check(path, Match.OneOf(String, RegExp));

    if (path instanceof RegExp || path.indexOf('*') == -1)
        return path;

    var parsedPath = pathUtils.parseAccessPath(path, patternPathParsePattern)
        , regexStr = '^'
        // , regexStrEnd = ''
        , patternsStarted = false;

    parsedPath.forEach(function(pathNode) {
        var prop = pathNode.property
            , regex = nodeRegex[prop];
        
        if (regex) {
            // regexStr += '(' + regex;
            // regexStrEnd += '|)';
            regexStr += '(' + regex + '|)';
            // regexStrEnd += '|)';
            patternsStarted = true;
        } else {
            // if (patternsStarted)
            //  throw new ModelError('"*" path segment cannot be in the middle of the path: ' + path);
            regexStr += prop.replace(/(\.|\[|\])/g, '\\$1'); // add slash in front of symbols that have special meaning in regex
        }
    });

    regexStr += /* regexStrEnd + */ '$';

    try {
        return new RegExp(regexStr);
    } catch (e) {
        throw new ModelError('can\'t construct regex for path pattern: ' + path);
    }
}


function getPathNodeKey(pathNode, interpolated) {
    var prop = pathNode.property
        , startIndex = interpolated ? 2 : 1;
    return pathNode.syntax == 'array'
        ? prop.slice(startIndex, prop.length - 1)
        : prop.slice(startIndex);
}


// TODO allow for multiple messages in a string
function wrapMessengerMethods(methodsNames) {
    methodsNames = methodsNames || ['on', 'off'];
    var wrappedMethods = _.mapToObject(methodsNames, function(methodName) {
        var origMethod = this[methodName];
        // replacing message subsribe/unsubscribe/etc. to convert "*" message patterns to regexps
        return function(path, subscriber) {
            var regexPath = createRegexPath(path);
            origMethod.call(this, regexPath, subscriber);
        };
    }, this);
    _.defineProperties(this, wrappedMethods);
}

},{"../util/check":88,"../util/error":94,"mol-proto":109}],84:[function(require,module,exports){
'use strict';

var pathUtils = require('../path_utils')
    , modelUtils = require('../model_utils')
    , logger = require('../../util/logger')
    , miloCount = require('../../util/count')
    , fs = require('fs')
    , doT = require('dot')
    , _ = require('mol-proto')
    , changeDataHandler = require('../change_data')
    , getTransactionFlag = changeDataHandler.getTransactionFlag
    , postTransactionFinished = changeDataHandler.postTransactionFinished;


/**
 * Templates to synthesize model getters and setters
 */
var templates = {
    get: "'use strict';\n/* Only use this style of comments, not \"//\" */\n\nmethod = function get() {\n    var m = {{# def.modelAccessPrefix }};\n    return m {{~ it.parsedPath :pathNode }}\n        {{? pathNode.interpolate}}\n            && (m = m[this._args[ {{= pathNode.interpolate }} ]])\n        {{??}}\n            && (m = m{{= pathNode.property }})\n        {{?}} {{~}};\n};\n",
    set: "'use strict';\n/* Only use this style of comments, not \"//\" */\n\n{{# def.include_defines }}\n{{# def.include_create_tree }}\n\n\n/**\n * Template that synthesizes setter for Model and for ModelPath\n */\nmethod = function set(value) {\n    {{# def.initVars:'set' }}\n\n    {{# def.createTree:'set' }}\n\n    {{\n        currNode = nextNode;\n        currProp = currNode && currNode.property;\n    }}\n\n    {{ /* assign value to the last property */ }}\n    {{? currProp }}\n        wasDef = {{# def.wasDefined}};\n        {{# def.changeAccessPath }}\n\n        var old = m{{# def.currProp }};\n\n        {{ /* clone value to prevent same reference in linked models */ }}\n        m{{# def.currProp }} = cloneTree(value);\n    {{?}}\n\n    {{ /* add message related to the last property change */ }}\n    if (! wasDef)\n        {{# def.addMsg }} accessPath, type: 'added',\n                newValue: value });\n    else if (old != value)\n        {{# def.addMsg }} accessPath, type: 'changed',\n                oldValue: old, newValue: value });\n\n    {{ /* add message related to changes in (sub)properties inside removed and assigned value */ }}\n    if (! wasDef || old != value)\n        addTreeChangesMessages(messages, messagesHash,\n            accessPath, old, value); /* defined in the function that synthesizes ModelPath setter */\n\n    {{ /* post all stored messages */ }}\n    {{# def.postMessages }}\n};\n",
    del: "'use strict';\n/* Only use this style of comments, not \"//\" */\n\n{{# def.include_defines }}\n{{# def.include_traverse_tree }}\n\nmethod = function del() {\n    {{# def.initVars:'del' }}\n\n    {{? it.parsedPath.length }}\n        {{# def.traverseTree }}\n\n        {{\n            var currNode = it.parsedPath[count];\n            var currProp = currNode.property;       \n        }}\n\n        if (! treeDoesNotExist && m && m.hasOwnProperty && {{# def.wasDefined}}) {\n            var old = m{{# def.currProp }};\n            delete m{{# def.currProp }};\n            {{# def.changeAccessPath }}\n            var didDelete = true;\n        }\n    {{??}}\n        if (typeof m != 'undefined') {\n            var old = m;\n            {{# def.modelAccessPrefix }} = undefined;\n            var didDelete = true;\n        }\n    {{?}}\n\n    if (didDelete) {\n        {{# def.addMsg }} accessPath, type: 'deleted', oldValue: old });\n\n        addTreeChangesMessages(messages, messagesHash,\n            accessPath, old, undefined); /* defined in the function that synthesizes ModelPath setter */\n\n        {{ /* post all stored messages */ }}\n        {{# def.postMessages }}\n    }\n};\n",
    splice: "'use strict';\n/* Only use this style of comments, not \"//\" */\n\n{{# def.include_defines }}\n{{# def.include_create_tree }}\n{{# def.include_traverse_tree }}\n\nmethod = function splice(spliceIndex, spliceHowMany) { /* ,... - extra arguments to splice into array */\n    {{# def.initVars:'splice' }}\n\n    var argsLen = arguments.length;\n    var addItems = argsLen > 2;\n\n    if (addItems) {\n        {{ /* only create model tree if items are inserted in array */ }}\n\n        {{ /* if model is undefined it will be set to an empty array */ }}  \n        var value = [];\n        {{# def.createTree:'splice' }}\n\n        {{? nextNode }}\n            {{\n                var currNode = nextNode;\n                var currProp = currNode.property;\n                var emptyProp = '[]';\n            }}\n\n            {{# def.createTreeStep }}\n        {{?}}\n\n    } else if (spliceHowMany > 0) {\n        {{ /* if items are not inserted, only traverse model tree if items are deleted from array */ }}\n        {{? it.parsedPath.length }}\n            {{# def.traverseTree }}\n\n            {{\n                var currNode = it.parsedPath[count];\n                var currProp = currNode.property;       \n            }}\n\n            {{ /* extra brace closes 'else' in def.traverseTreeStep */ }}\n            {{# def.traverseTreeStep }} }\n        {{?}}\n    }\n\n    {{ /* splice items */ }}\n    if (addItems || (! treeDoesNotExist && m\n            && m.length > spliceIndex ) ) {\n        var oldLength = m.length = m.length || 0;\n\n        arguments[0] = spliceIndex = normalizeSpliceIndex(spliceIndex, m.length);\n\n        {{ /* clone added arguments to prevent same references in linked models */ }}\n        if (addItems)\n            for (var i = 2; i < argsLen; i++)\n                arguments[i] = cloneTree(arguments[i]);\n\n        {{ /* actual splice call */ }}\n        var removed = Array.prototype.splice.apply(m, arguments);\n\n        {{# def.addMsg }} accessPath, type: 'splice',\n                index: spliceIndex, removed: removed, addedCount: addItems ? argsLen - 2 : 0,\n                newValue: m });\n\n        if (removed && removed.length)\n            removed.forEach(function(item, index) {\n                var itemPath = accessPath + '[' + (spliceIndex + index) + ']';\n                {{# def.addMsg }} itemPath, type: 'removed', oldValue: item });\n\n                if (valueIsTree(item))\n                    addMessages(messages, messagesHash, itemPath, item, 'removed', 'oldValue');\n            });\n\n        if (addItems)\n            for (var i = 2; i < argsLen; i++) {\n                var item = arguments[i];\n                var itemPath = accessPath + '[' + (spliceIndex + i - 2) + ']';\n                {{# def.addMsg }} itemPath, type: 'added', newValue: item });\n\n                if (valueIsTree(item))\n                    addMessages(messages, messagesHash, itemPath, item, 'added', 'newValue');\n            }\n\n        {{ /* post all stored messages */ }}\n        {{# def.postMessages }}\n    }\n\n    return removed || [];\n}\n"
};

var include_defines = "'use strict';\n/* Only use this style of comments, not \"//\" */\n\n/**\n * Inserts initialization code\n */\n {{## def.initVars:method:\n    var m = {{# def.modelAccessPrefix }};\n    var messages = [], messagesHash = {};\n    var accessPath = '';\n    var treeDoesNotExist;\n    /* hack to prevent sending finished events to allow for propagation of batches without splitting them */\n    var inChangeTransaction = getTransactionFlag( {{= method }} );\n #}}\n\n/**\n * Inserts the beginning of function call to add message to list\n */\n{{## def.addMsg: addChangeMessage(messages, messagesHash, { path: #}}\n\n/**\n * Inserts current property/index for both normal and interpolated properties/indexes \n */\n{{## def.currProp:{{? currNode.interpolate }}[this._args[ {{= currNode.interpolate }} ]]{{??}}{{= currProp }}{{?}} #}}\n\n/**\n * Inserts condition to test whether normal/interpolated property/index exists \n */\n{{## def.wasDefined: m.hasOwnProperty(\n    {{? currNode.interpolate }}\n        this._args[ {{= currNode.interpolate }} ]\n    {{??}}\n        '{{= it.getPathNodeKey(currNode) }}'\n    {{?}}\n) #}}\n\n\n/**\n * Inserts code to update access path for current property\n * Because of the possibility of interpolated properties, it can't be calculated in template, it can only be calculated during accessor call. \n */\n{{## def.changeAccessPath:\n    accessPath += {{? currNode.interpolate }}\n        {{? currNode.syntax == 'array' }}\n            '[' + this._args[ {{= currNode.interpolate }} ] + ']';\n        {{??}}\n            '.' + this._args[ {{= currNode.interpolate }} ];\n        {{?}}\n    {{??}}\n        '{{= currProp }}';\n    {{?}}\n#}}\n\n\n/**\n * Inserts code to post stored messages\n */\n{{## def.postMessages:\n    if (messages.length) {\n        {{# def.modelPostBatchCode }}('datachanges', {\n            changes: messages,\n            transaction: inChangeTransaction\n        }); \n\n        messages.forEach(function(msg) {\n            {{# def.modelPostMessageCode }}(msg.path, msg);\n        }, this);\n    }\n#}}\n"
    , include_create_tree = "'use strict';\n/* Only use this style of comments, not \"//\" */\n\n/**\n * Inserts code to create model tree as neccessary for `set` and `splice` accessors and to add messages to send list if the tree changes.\n */\n{{## def.createTree:method:\n    var wasDef = true;\n    var old = m;\n\n    {{ var emptyProp = it.parsedPath[0] && it.parsedPath[0].empty; }}\n    {{? emptyProp }}\n        {{ /* create top level model if it was not previously defined */ }}\n        if (! m) {\n            m = {{# def.modelAccessPrefix }} = {{= emptyProp }};\n            wasDef = false;\n\n            {{# def.addMsg }} '', type: 'added',\n                  newValue: m });\n        }\n    {{??}}\n        {{? method == 'splice' }}\n            if (! m) {\n        {{?}}\n                m = {{# def.modelAccessPrefix }} = cloneTree(value);\n                wasDef = typeof old != 'undefined';\n        {{? method == 'splice' }}\n            }\n        {{?}}       \n    {{?}}\n\n\n    {{ /* create model tree if it doesn't exist */ }}\n    {{  var modelDataProperty = '';\n        var nextNode = it.parsedPath[0];\n        var count = it.parsedPath.length - 1;\n\n        for (var i = 0; i < count; i++) {\n            var currNode = nextNode;\n            var currProp = currNode.property;\n            nextNode = it.parsedPath[i + 1];\n            var emptyProp = nextNode && nextNode.empty;\n    }}\n\n        {{# def.createTreeStep }}\n\n    {{  } /* for loop */ }}\n#}}\n\n\n/**\n * Inserts code to create one step in the model tree\n */\n{{## def.createTreeStep:\n    {{# def.changeAccessPath }}\n\n    if (! {{# def.wasDefined }}) { \n        {{ /* property does not exist */ }}\n        m = m{{# def.currProp }} = {{= emptyProp }};\n\n        {{# def.addMsg }} accessPath, type: 'added', \n              newValue: m });\n\n    } else if (typeof m{{# def.currProp }} != 'object') {\n        {{ /* property is not object */ }}\n        var old = m{{# def.currProp }};\n        m = m{{# def.currProp }} = {{= emptyProp }};\n\n        {{# def.addMsg }} accessPath, type: 'changed', \n              oldValue: old, newValue: m });\n\n    } else {\n        {{ /* property exists, just traverse down the model tree */ }}\n        m = m{{# def.currProp }};\n    }\n#}}\n"
    , include_traverse_tree = "'use strict';\n/* Only use this style of comments, not \"//\" */\n\n/**\n * Inserts code to traverse model tree for `delete` and `splice` accessors.\n */\n{{## def.traverseTree:\n    {{ \n        var count = it.parsedPath.length-1;\n\n        for (var i = 0; i < count; i++) { \n            var currNode = it.parsedPath[i];\n            var currProp = currNode.property;\n    }}\n            {{# def.traverseTreeStep }}\n\n    {{ } /* for loop */\n\n        var i = count;\n        while (i--) { /* closing braces for else's above */\n    }}\n            }\n    {{ } /* while loop */ }}\n#}}\n\n\n/**\n * Inserts code to traverse one step in the model tree\n */\n{{## def.traverseTreeStep:\n    if (! (m && m.hasOwnProperty && {{# def.wasDefined}} ) )\n        treeDoesNotExist = true;\n    else {\n        m = m{{# def.currProp }};\n        {{# def.changeAccessPath }}\n    {{ /* brace from else is not closed on purpose - all braces are closed in while loop */ }}\n#}}\n";

var dotDef = {
    include_defines: include_defines,
    include_create_tree: include_create_tree,
    include_traverse_tree: include_traverse_tree,
    getPathNodeKey: pathUtils.getPathNodeKey,
    modelAccessPrefix: 'this._model._data',
    modelPostMessageCode: 'this._model._internalMessenger.postMessage',
    modelPostBatchCode: 'this._model.postMessageSync',
    internalMessenger: 'this._model._internalMessenger'
};

var modelDotDef = _(dotDef).clone().extend({
    modelAccessPrefix: 'this._data',
    modelPostMessageCode: 'this._internalMessenger.postMessage',
    modelPostBatchCode: 'this.postMessageSync',
    internalMessenger: 'this._internalMessenger'
})._();


var dotSettings = _.clone(doT.templateSettings);
dotSettings.strip = false;

var synthesizers = _.mapKeys(templates, function(tmpl) {
    return doT.template(tmpl, dotSettings, dotDef); 
});


var modelSynthesizers = _.mapToObject(['set', 'del', 'splice'], function(methodName) {
    return doT.template(templates[methodName], dotSettings, modelDotDef);
});


/**
 * Function that synthesizes accessor methods.
 * Function is memoized so accessors are cached (up to 1000).
 *
 * @param {String} path Model/ModelPath access path
 * @param {Array} parsedPath array of path nodes
 * @return {Object[Function]}
 */
var synthesizePathMethods = _.memoize(_synthesizePathMethods, undefined, 1000);

function _synthesizePathMethods(path, parsedPath) {
    var methods = _.mapKeys(synthesizers, function(synthszr) {
        return _synthesize(synthszr, path, parsedPath);
    });
    return methods;
}


var normalizeSpliceIndex = modelUtils.normalizeSpliceIndex; // used in splice.dot.js


function _synthesize(synthesizer, path, parsedPath) {
    var method
        , methodCode = synthesizer({
            parsedPath: parsedPath,
            getPathNodeKey: pathUtils.getPathNodeKey
        });

    try {
        eval(methodCode);
    } catch (e) {
        throw ModelError('ModelPath method compilation error; path: ' + path + ', code: ' + methodCode);
    }

    return method;


    // functions used by methods `set`, `delete` and `splice` (synthesized by template)
    function addChangeMessage(messages, messagesHash, msg) {
        messages.push(msg);
        messagesHash[msg.path] = msg;
    }

    function addTreeChangesMessages(messages, messagesHash, rootPath, oldValue, newValue) {
        var oldIsTree = valueIsTree(oldValue)
            , newIsTree = valueIsTree(newValue);

        if (newIsTree)
            addMessages(messages, messagesHash, rootPath, newValue, 'added', 'newValue');
        
        if (oldIsTree)
            addMessages(messages, messagesHash, rootPath, oldValue, 'removed', 'oldValue');
    }

    function addMessages(messages, messagesHash, rootPath, obj, msgType, valueProp) {
        _addMessages(rootPath, obj);


        function _addMessages(rootPath, obj) {
            if (Array.isArray(obj)) {
                var pathSyntax = rootPath + '[$$]';
                obj.forEach(function(value, index) {
                    addMessage(value, index, pathSyntax);
                });
            } else {
                var pathSyntax = rootPath + '.$$';
                _.eachKey(obj, function(value, key) {
                    addMessage(value, key, pathSyntax);
                });
            }
        }

        function addMessage(value, key, pathSyntax) {
            var path = pathSyntax.replace('$$', key)
                , existingMsg = messagesHash[path];

            if (existingMsg) {
                if (existingMsg.type == msgType)
                    logger.error('setter error: same message type posted on the same path');
                else {
                    existingMsg.type = 'changed';
                    existingMsg[valueProp] = value;
                }
            } else {
                var msg = { path: path, type: msgType };
                msg[valueProp] = value;
                addChangeMessage(messages, messagesHash, msg);
            }

            if (valueIsTree(value))
                _addMessages(path, value);
        }
    }

    function cloneTree(value) {
        return valueIsNormalObject(value)
                ? _.deepClone(value)
                : value;
    }

    function protectValue(value) {
        return ! valueIsNormalObject(value)
                ? value
                : Array.isArray(value)
                    ? value.slice()
                    : Object.create(value);
    }

    function valueIsTree(value) {
        return valueIsNormalObject(value)
                && Object.keys(value).length;
    }

    function valueIsNormalObject(value) {
        return value != null
                && typeof value == "object"
                && ! (value instanceof Date)
                && ! (value instanceof RegExp);
    }

    function addBatchIdsToMessage(msg, batchId, msgId) {
        _.defineProperties(msg, {
            __batch_id: batchId,
            __msg_id: msgId
        });
    }
}


/**
 * Exports `synthesize` function with the following:
 *
 * - .modelMethods.set - `set` method for Model
 * - .modelMethods.del - `del` method for Model
 * - .modelMethods.splice - `splice` method for Model
 */
module.exports = synthesizePathMethods;

var modelMethods = _.mapKeys(modelSynthesizers, function(synthesizer) {
    return _synthesize(synthesizer, '', []);
});

synthesizePathMethods.modelMethods = modelMethods;

},{"../../util/count":90,"../../util/logger":98,"../change_data":76,"../model_utils":81,"../path_utils":83,"dot":107,"fs":108,"mol-proto":109}],85:[function(require,module,exports){
'use strict';

/**
 * Registries of facets and of components
 *
 * - [facets](./components/c_facets/cf_registry.js.html)
 * - [components](./components/c_registry.js.html)
 */
var registry = module.exports = {
    facets: require('./components/c_facets/cf_registry'),
    components: require('./components/c_registry'),
    commands: require('./command/cmd_registry')
};

},{"./command/cmd_registry":12,"./components/c_facets/cf_registry":31,"./components/c_registry":33}],86:[function(require,module,exports){
'use strict';

require('./components/classes/View');
require('./components/ui/Group');
require('./components/ui/Wrapper');
require('./components/ui/Text');
require('./components/ui/Select');
require('./components/ui/Input');
require('./components/ui/InputList');
require('./components/ui/Textarea');
require('./components/ui/RadioGroup');
require('./components/ui/Button');
require('./components/ui/Hyperlink');
require('./components/ui/List');
require('./components/ui/ListItem');
require('./components/ui/Time');
require('./components/ui/Date');
require('./components/ui/Combo');
require('./components/ui/SuperCombo');
require('./components/ui/ComboList');
require('./components/ui/Image');
require('./components/ui/DropTarget');

require('./components/ui/bootstrap/Dropdown');
// require('./components/ui/bootstrap/Dialog');

},{"./components/classes/View":35,"./components/ui/Button":42,"./components/ui/Combo":43,"./components/ui/ComboList":44,"./components/ui/Date":45,"./components/ui/DropTarget":46,"./components/ui/Group":47,"./components/ui/Hyperlink":48,"./components/ui/Image":49,"./components/ui/Input":50,"./components/ui/InputList":51,"./components/ui/List":52,"./components/ui/ListItem":53,"./components/ui/RadioGroup":54,"./components/ui/Select":55,"./components/ui/SuperCombo":56,"./components/ui/Text":57,"./components/ui/Textarea":58,"./components/ui/Time":59,"./components/ui/Wrapper":60,"./components/ui/bootstrap/Dropdown":63}],87:[function(require,module,exports){
'use strict';

require('./components/c_facets/Dom');
require('./components/c_facets/Data');
require('./components/c_facets/Frame');
require('./components/c_facets/Events');
require('./components/c_facets/Options');
require('./components/c_facets/Template');
require('./components/c_facets/Container');
require('./components/c_facets/ModelFacet');
require('./components/c_facets/Drag');
require('./components/c_facets/Drop');
require('./components/c_facets/List');
require('./components/c_facets/Item');
require('./components/c_facets/Transfer');

},{"./components/c_facets/Container":18,"./components/c_facets/Data":19,"./components/c_facets/Dom":20,"./components/c_facets/Drag":21,"./components/c_facets/Drop":22,"./components/c_facets/Events":23,"./components/c_facets/Frame":24,"./components/c_facets/Item":25,"./components/c_facets/List":26,"./components/c_facets/ModelFacet":27,"./components/c_facets/Options":28,"./components/c_facets/Template":29,"./components/c_facets/Transfer":30}],88:[function(require,module,exports){
'use strict';

/**
 * `milo.utils.check`
 *
 * Check is a module for parameters checking extracted from [Meteor](http://docs.meteor.com/) framework.
 *
 * It allows to both document and to check parameter types in your function
 * making code both readable and stable.
 *
 *
 * ### Usage
 *```
 * var check = milo.check
 *     , Match = check.Match;
 *
 * function My(name, obj, cb) {
 *     // if any of checks fail an error will be thrown
 *     check(name, String);
 *     check(obj, Match.ObjectIncluding({ options: Object }));
 *     check(cb, Function);
 *
 *     // ... your code
 * }
 *```
 * See [Meteor docs](http://docs.meteor.com/#match) to see how it works
 *
 *
 * ### Patterns
 *
 * All patterns and functions described in Meteor docs work.
 *
 * Unlike in Meteor, Object pattern matches instance of any class,
 * not only plain object.
 *
 * In addition to patterns described in Meteor docs the following patterns are implemented
 *
 * * Match.__ObjectHash__(_pattern_)
 *
 *   Matches an object where all properties match a given pattern
 *
 * * Match.__Subclass__(_constructor_ [, _matchThisClassToo_])
 *
 *   Matches a class that is a subclass of a given class. If the second parameter
 *   is true, it will also match the class itself.
 *
 *   Without this pattern to check if _MySubclass_ is a subclass of _MyClass_
 *   you would have to use
 *
 *       check(MySubclass, Match.Where(function() {
 *           return MySubclass.prototype instanceof MyClass;
 *       });
 *
 *
 * Things we explicitly do NOT support:
 *    - heterogenous arrays
**/

var _ = require('mol-proto')
    , config = require('../config');

var check = function (value, pattern) {
    if (config.check === false)
        return;

    // Record that check got called, if somebody cared.
    try {
        checkSubtree(value, pattern);
    } catch (err) {
        if ((err instanceof Match.Error) && err.path)
            err.message += " in field " + err.path;
        throw err;
    }
};

module.exports = check;

var Match = check.Match = {
    Optional: function (pattern) {
        return new Optional(pattern);
    },
    OneOf: function (/* arguments */) {
        return new OneOf(arguments);
    },
    Any: ['__any__'],
    Where: function (condition) {
        return new Where(condition);
    },
    ObjectIncluding: function (pattern) {
        return new ObjectIncluding(pattern);
    },
    // Matches only signed 32-bit integers
    Integer: ['__integer__'],

    // Matches string that is a valid identifier, will not allow javascript reserved words
    IdentifierString: /^[a-z_$][0-9a-z_$]*$/i, 

    // Matches hash (object) with values matching pattern
    ObjectHash: function(pattern) {
        return new ObjectHash(pattern);
    },

    Subclass: function(Superclass, matchSuperclassToo) {
        return new Subclass(Superclass, matchSuperclassToo);
    },

    // XXX matchers should know how to describe themselves for errors
    Error: TypeError,

    // Meteor.makeErrorType("Match.Error", function (msg) {
        // this.message = "Match error: " + msg;
        // The path of the value that failed to match. Initially empty, this gets
        // populated by catching and rethrowing the exception as it goes back up the
        // stack.
        // E.g.: "vals[3].entity.created"
        // this.path = "";
        // If this gets sent over DDP, don't give full internal details but at least
        // provide something better than 500 Internal server error.
    //     this.sanitizedError = new Meteor.Error(400, "Match failed");
    // }),

    // Tests to see if value matches pattern. Unlike check, it merely returns true
    // or false (unless an error other than Match.Error was thrown).
    test: function (value, pattern) {
        try {
            checkSubtree(value, pattern);
            return true;
        } catch (e) {
            if (e instanceof Match.Error)
                return false;
            // Rethrow other errors.
            throw e;
        }
    }
};

function Optional(pattern) {
    this.pattern = pattern;
};

function OneOf(choices) {
    if (choices.length == 0)
        throw new Error("Must provide at least one choice to Match.OneOf");
    this.choices = choices;
};

function Where(condition) {
    this.condition = condition;
};

function ObjectIncluding(pattern) {
    this.pattern = pattern;
};

function ObjectHash(pattern) {
    this.pattern = pattern;
};

function Subclass(Superclass, matchSuperclassToo) {
    this.Superclass = Superclass;
    this.matchSuperclass = matchSuperclassToo;
};

var typeofChecks = [
    [String, "string"],
    [Number, "number"],
    [Boolean, "boolean"],
    [Function, "function"],
    // While we don't allow undefined in JSON, this is good for optional
    // arguments with OneOf.
    [undefined, "undefined"]
];

function checkSubtree(value, pattern) {
    // Match anything!
    if (pattern === Match.Any)
        return;

    // Basic atomic types.
    // Do not match boxed objects (e.g. String, Boolean)
    for (var i = 0; i < typeofChecks.length; ++i) {
        if (pattern === typeofChecks[i][0]) {
            if (typeof value === typeofChecks[i][1])
                return;
            throw new Match.Error("Expected " + typeofChecks[i][1] + ", got " +
                                                        typeof value);
        }
    }
    if (pattern === null) {
        if (value === null)
            return;
        throw new Match.Error("Expected null, got " + JSON.stringify(value));
    }

    // Match.Integer is special type encoded with array
    if (pattern === Match.Integer) {
        // There is no consistent and reliable way to check if variable is a 64-bit
        // integer. One of the popular solutions is to get reminder of division by 1
        // but this method fails on really large floats with big precision.
        // E.g.: 1.348192308491824e+23 % 1 === 0 in V8
        // Bitwise operators work consistantly but always cast variable to 32-bit
        // signed integer according to JavaScript specs.
        if (typeof value === 'number' && (value | 0) === value)
            return
        throw new Match.Error('Expected Integer, got '
                                + (value instanceof Object ? JSON.stringify(value) : value));
    }

    if (pattern === Match.IdentifierString) {
        if (typeof value === 'string' && Match.IdentifierString.test(value)
                && _jsKeywords.indexOf(key) == -1)
            return;
        throw new Match.Error('Expected identifier string, got '
                                + (value instanceof Object ? JSON.stringify(value) : value));
    }

    // "Object" is shorthand for Match.ObjectIncluding({});
    if (pattern === Object)
        pattern = Match.ObjectIncluding({});

    // Array (checked AFTER Any, which is implemented as an Array).
    if (pattern instanceof Array) {
        if (pattern.length !== 1)
            throw Error("Bad pattern: arrays must have one type element" +
                                    JSON.stringify(pattern));
        if (!Array.isArray(value)) {
            throw new Match.Error("Expected array, got " + JSON.stringify(value));
        }

        value.forEach(function (valueElement, index) {
            try {
                checkSubtree(valueElement, pattern[0]);
            } catch (err) {
                if (err instanceof Match.Error) {
                    err.path = _prependPath(index, err.path);
                }
                throw err;
            }
        });
        return;
    }

    // Arbitrary validation checks. The condition can return false or throw a
    // Match.Error (ie, it can internally use check()) to fail.
    if (pattern instanceof Where) {
        if (pattern.condition(value))
            return;
        // XXX this error is terrible
        throw new Match.Error("Failed Match.Where validation");
    }


    if (pattern instanceof Optional)
        pattern = Match.OneOf(undefined, pattern.pattern);

    if (pattern instanceof OneOf) {
        for (var i = 0; i < pattern.choices.length; ++i) {
            try {
                checkSubtree(value, pattern.choices[i]);
                // No error? Yay, return.
                return;
            } catch (err) {
                // Other errors should be thrown. Match errors just mean try another
                // choice.
                if (!(err instanceof Match.Error))
                    throw err;
            }
        }
        // XXX this error is terrible
        throw new Match.Error("Failed Match.OneOf or Match.Optional validation");
    }

    // A function that isn't something we special-case is assumed to be a
    // constructor.
    if (pattern instanceof Function) {
        if (value instanceof pattern)
            return;
        // XXX what if .name isn't defined
        throw new Match.Error("Expected " + pattern.constructor.name);
    }

    var unknownKeysAllowed = false;
    if (pattern instanceof ObjectIncluding) {
        unknownKeysAllowed = true;
        pattern = pattern.pattern;
    }

    if (pattern instanceof ObjectHash) {
        var keyPattern = pattern.pattern;
        var emptyHash = true;
        for (var key in value) {
            emptyHash = false;
            check(value[key], keyPattern);
        }
        if (emptyHash)
            throw new Match.Error("Expected " + pattern.constructor.name);
        return;
    }

    if (pattern instanceof Subclass) {
        var Superclass = pattern.Superclass;
        if (pattern.matchSuperclass && value == Superclass) 
            return;
        if (! (value.prototype instanceof Superclass))
            throw new Match.Error("Expected " + pattern.constructor.name + " of " + Superclass.name);
        return;
    }

    if (typeof pattern !== "object")
        throw Error("Bad pattern: unknown pattern type");

    // An object, with required and optional keys. Note that this does NOT do
    // structural matches against objects of special types that happen to match
    // the pattern: this really needs to be a plain old {Object}!
    if (typeof value !== 'object')
        throw new Match.Error("Expected object, got " + typeof value);
    if (value === null)
        throw new Match.Error("Expected object, got null");

    var requiredPatterns = {};
    var optionalPatterns = {};

    _.eachKey(pattern, function(subPattern, key) {
        if (pattern[key] instanceof Optional)
            optionalPatterns[key] = pattern[key].pattern;
        else
            requiredPatterns[key] = pattern[key];
    }, this, true);

    _.eachKey(value, function(subValue, key) {
        var subValue = value[key];
        try {
            if (requiredPatterns.hasOwnProperty(key)) {
                checkSubtree(subValue, requiredPatterns[key]);
                delete requiredPatterns[key];
            } else if (optionalPatterns.hasOwnProperty(key)) {
                checkSubtree(subValue, optionalPatterns[key]);
            } else {
                if (!unknownKeysAllowed)
                    throw new Match.Error("Unknown key");
            }
        } catch (err) {
            if (err instanceof Match.Error)
                err.path = _prependPath(key, err.path);
            throw err;
        }
    }, this, true);

    _.eachKey(requiredPatterns, function(value, key) {
        throw new Match.Error("Missing key '" + key + "'");
    }, this, true);
};


var _jsKeywords = ["do", "if", "in", "for", "let", "new", "try", "var", "case",
    "else", "enum", "eval", "false", "null", "this", "true", "void", "with",
    "break", "catch", "class", "const", "super", "throw", "while", "yield",
    "delete", "export", "import", "public", "return", "static", "switch",
    "typeof", "default", "extends", "finally", "package", "private", "continue",
    "debugger", "function", "arguments", "interface", "protected", "implements",
    "instanceof"];

// Assumes the base of path is already escaped properly
// returns key + base
function _prependPath(key, base) {
    if ((typeof key) === "number" || key.match(/^[0-9]+$/))
        key = "[" + key + "]";
    else if (!key.match(Match.IdentifierString) || _jsKeywords.indexOf(key) != -1)
        key = JSON.stringify([key]);

    if (base && base[0] !== "[")
        return key + '.' + base;
    return key + base;
};


},{"../config":64,"mol-proto":109}],89:[function(require,module,exports){
'use strict';

var count = require('./count')
    , config = require('../config')
    , prefix = config.componentPrefix;


module.exports = componentName;


function componentName() {
    return prefix + count();
}

},{"../config":64,"./count":90}],90:[function(require,module,exports){
'use strict';

var timestamp = Date.now()
    , count = ''
    , uniqueID = '' + timestamp;

function uniqueCount() {
    var newTimestamp = Date.now();
    uniqueID = '' + newTimestamp;
    if (timestamp == newTimestamp) {
        count = count === '' ? 0 : count + 1;
        uniqueID += '_' + count;
    } else {
        timestamp = newTimestamp;
        count = '';
    }

    return uniqueID;
}

uniqueCount.get = function() {
    return uniqueID;
}

module.exports = uniqueCount;

},{}],91:[function(require,module,exports){
'use strict';


var config = require('../config')
    , _ = require('mol-proto')
    , logger = require('./logger');

var domUtils = {
    children: children,
    filterNodeListByType: filterNodeListByType,
    containingElement: containingElement,
    selectElementContents: selectElementContents,
    getElementOffset: getElementOffset,
    setCaretPosition: setCaretPosition,
    getSelectionDirection: getSelectionDirection,
    setSelection: setSelection,
    clearSelection: clearSelection,
    removeElement: removeElement,
    unwrapElement: unwrapElement,
    wrapInElement: wrapInElement,
    detachComponent: detachComponent,
    firstTextNode: firstTextNode,
    lastTextNode: lastTextNode,
    trimNodeRight: trimNodeRight,
    trimNodeLeft: trimNodeLeft,
    stripHtml: stripHtml,
    htmlEntities: htmlEntities,
    walkTree: walkTree,
    createTreeWalker: createTreeWalker,

    treeIndexOf: treeIndexOf, // deprecated
    getNodeAtTreeIndex: getNodeAtTreeIndex, // deprecated
    insertAtTreeIndex: insertAtTreeIndex, // deprecated

    treePathOf: treePathOf,
    getNodeAtTreePath: getNodeAtTreePath,
    insertAtTreePath: insertAtTreePath,
    isTreePathBefore: isTreePathBefore,

    getNodeWindow: getNodeWindow,

    getComponentsFromRange: getComponentsFromRange,
    deleteRangeWithComponents: deleteRangeWithComponents,
    forEachNodesInRange: forEachNodesInRange,
    areRangesEqual: areRangesEqual,

    addDebugPoint: addDebugPoint
};

module.exports = domUtils;


/**
 * Returns the list of element children of DOM element
 *
 * @param {Element} el element to return the children of (only DOM elements)
 * @return {Array[Element]}
 */
 function children(el) {
    return filterNodeListByType(el.childNodes, Node.ELEMENT_NODE)
 }


/**
 * Filters the list of nodes by type
 *
 * @param {NodeList} nodeList the list of nodes, for example childNodes property of DOM element
 * @param {Integer} nodeType an integer constant [defined by DOM API](https://developer.mozilla.org/en-US/docs/Web/API/Node.nodeType), e.g. `Node.ELEMENT_NODE` or `Node.TEXT_NODE`
 * @return {Array[Node]}
 */
function filterNodeListByType(nodeList, nodeType) {
    return _.filter(nodeList, function (node) {
        return node.nodeType == nodeType;
    });
}


/**
 * Find nearest parent element for node.
 * If node is an element, it will be returned.
 *
 * @param {Node} node
 * @return {Element|null}
 */
function containingElement(node) {
    while (node) {
        if (node.nodeType == Node.ELEMENT_NODE)
            return node;
        node = node.parentNode;
    }
    return null;
}


/**
 * Selects inner contents of DOM element
 * 
 * @param {Element} el DOM element
 */
function selectElementContents(el) {
    var doc = el.ownerDocument;
    if (! doc) return logger.error('selectElementContents: element has no document')
    var range = doc.createRange();
    range.selectNodeContents(el);
    var win = getNodeWindow(el)
        , sel = win.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}


/**
 * Sets the caret position to the position in the node
 * 
 * @param {Node} node DOM node
 * @param {Number} pos caret position
 */
function setCaretPosition(node, pos) {
    var doc = node.ownerDocument;
    if (! doc) return logger.error('setCaretPosition: element has no document')
    var range = doc.createRange();
    range.setStart(node, pos);
    var win = getNodeWindow(node)
        , sel = win.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
}

/**
 * get the direction of a selection
 *
 * 1 forward, -1 backward, 0 no direction, undefined one of the node is detached or in a different frame
 *
 * @param {sel} a selection object
 * @return {-1|0|1|undefined}
 */
function getSelectionDirection(sel){
    return _getDirection(sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset);
}

function _getDirection(fromNode, startOffset, toNode, endOffset){
    var docPosition = fromNode.compareDocumentPosition(toNode);
    if (docPosition & Node.DOCUMENT_POSITION_FOLLOWING){
        return 1;
    }
    else if (docPosition & Node.DOCUMENT_POSITION_PRECEDING){
        return -1;
    }
    else if (fromNode == toNode){
        if (startOffset < endOffset){
            return 1;
        }
        else if (startOffset > endOffset){
            return -1;
        }
        else {
            return 0;
        }
    }
}

/**
 * Selects a range in a document
 *
 * @param {Node} fromNode DOM node to start selection in
 * @param {Number} startOffset
 * @param {Node} toNode DOM node to end selection in
 * @param {Number} endOffset
 */
function setSelection(fromNode, startOffset, toNode, endOffset) {
    var doc = fromNode.ownerDocument;
    if (! doc) return logger('setCaretPosition: element has no document')
    var backward = _getDirection(fromNode, startOffset, toNode, endOffset) == -1;
    var range = doc.createRange();
    var container, originalContentEditable;
    // does not work in non contentEditable items

    var win = getNodeWindow(fromNode)
        , sel = win.getSelection();
    
    
    if (backward){
        range.setStart(toNode, endOffset);
        range.setEnd(fromNode, startOffset);
        range.collapse(false);
    }
    else {
        range.setStart(fromNode, startOffset);
        range.setEnd(toNode, endOffset);        
    }

    container = range.commonAncestorContainer == Node.ELEMENT_NODE ? 
        range.commonAncestorContainer : 
        range.commonAncestorContainer.parentElement;
        
    if (!container.isContentEditable){
        originalContentEditable = container.contentEditable; // false or inherit
        container.contentEditable = "true";
    }

    sel.removeAllRanges();
    sel.addRange(range);

    if (backward){
        sel.extend(toNode, endOffset);
    }

    if (originalContentEditable){
        // restoring contentEditable
        container.contentEditable = originalContentEditable;
    }

}

/**
 * Clears selection in a given window
 * @param {Window} win
 */
function clearSelection(win) {
    win = win || window;
    var sel = win.getSelection();
    sel.removeAllRanges();
}


/**
 * Calculates an element's total top and left offset from the document edge.
 * 
 * @param {Element} el the element for which position needs to be returned
 * @return {Object} vector object with properties topOffset and leftOffset
 */
function getElementOffset(el) {
    var yPos, xPos;     

    yPos = el.offsetTop;
    xPos = el.offsetLeft;
    el = el.offsetParent;

    while (el != null) {
        yPos += el.offsetTop;
        xPos += el.offsetLeft;
        el = el.offsetParent;
    }  

    return { topOffset: yPos, leftOffset: xPos };
}


/**
 * Removes element from the document
 *
 * @param {Element} el the element to be removed
 */
function removeElement(el) {
    var parent = el.parentNode;
    if (parent){
        parent.removeChild(el);
        parent.normalize();        
    }
}


/**
 * Returns the first child text node of an element
 *
 * @param {Element|Node} node the node to be searched, if the node is text node we return the node.
 * @return {TextNode}
 */
function firstTextNode(node) {
    if (node.nodeType == Node.TEXT_NODE) return node;
    var treeWalker = createTreeWalker(node, NodeFilter.SHOW_TEXT);
    return treeWalker.firstChild();
}


/**
 * Returns the last child text node of an element
 *
 * @param {Element|Node} node the node to be searched, if the node is text node we return the node.
 * @return {TextNode}
 */
function lastTextNode(node) {
    if (node.nodeType == Node.TEXT_NODE) return node;
    var treeWalker = createTreeWalker(node, NodeFilter.SHOW_TEXT);
    return treeWalker.lastChild();
}


/**
 * Removes element from the document putting its children in its place
 *
 * @param {Element} el the element to be "unwrapped"
 */
function unwrapElement(el) {
    var parent = el.parentNode;

    if (parent) {
        var frag = document.createDocumentFragment();
        // must be copied to avoid iterating a mutating list of childNodes
        var children = _.slice(el.childNodes);
        children.forEach(frag.appendChild, frag);
        parent.replaceChild(frag, el);
        parent.normalize();
    }
}


/**
 * Wraps an element in another element
 *
 * @param  {Element} wrapIntoEl
 * @param  {Element} el
 */
function wrapInElement(wrapIntoEl, el) {
    var parent = el.parentNode;

    if (parent) {
        parent.insertBefore(wrapIntoEl, el);
        wrapIntoEl.appendChild(el);
    }
}


/**
 * Trims a text node of trailing spaces, and returns true if a trim was performed.
 * 
 * @param  {TextNode} node
 * @return {Boolean}
 */
function trimNodeRight(node) {
    var lengthBefore = node.length;
    node.textContent = node.textContent.trimRight();
    var lengthAfter = node.length;

    return lengthBefore !== lengthAfter;
}


/**
 * Trims a text node of leading spaces, and returns true if a trim was performed.
 * 
 * @param  {TextNode} node
 * @return {Boolean}
 */
function trimNodeLeft(node) {
    var lengthBefore = node.length;
    node.textContent = node.textContent.trimLeft();
    var lengthAfter = node.length;

    return lengthBefore !== lengthAfter;
}


/**
 * Removes the reference to component from element
 * 
 * @param  {Element} el
 */
function detachComponent(el) {
    delete el[config.componentRef];
}


/**
 * Retrieves the content of a html string
 * @param  {String} str Any string
 * @return {String} returns the string cleaned of any html content.
 */
function stripHtml(str) {
    var div = document.createElement('DIV');
    div.innerHTML = str;
    return div.textContent || '';
}


/**
 * Convenience wrapper for native TreeWalker that automatically walks the tree and calls an iterator function.
 * This will not iterate the root element.
 * @param  {HTMLElement} root The containing root element to be walked. Will not be iterated.
 * @param  {NodeFiler} filter A NodeFilter constant, see https://developer.mozilla.org/en/docs/Web/API/TreeWalker
 * @param  {Function} iterator A function to be called on each node. Returning 'false' will break.
 * @param  {Object} context An optional context to passed, defaults to root.
 */
function walkTree(root, filter, iterator, context) {
    var tw = document.createTreeWalker(root, filter);
    while(tw.nextNode()) {
        var result = iterator.call(context || root, tw.currentNode);
        if (result === false) break;
    }
}


/**
 * Returns sequential index of element inside root element in DOM tree as traversed by TreeWalker.
 * Returns -1 if the element is not inside root element, 0 if the root element itself is passed.
 * 
 * @param  {Element} rootEl element to search
 * @param  {Element} el element to find the index of
 * @return {Number}
 */
function treeIndexOf(rootEl, el) {
    if (! (rootEl && rootEl.contains(el))) return -1;
    if (rootEl == el) return 0;

    var treeWalker = createTreeWalker(rootEl);
    treeWalker.currentNode = rootEl;
    var nextNode = treeWalker.nextNode()
        , index = 1;

    while (nextNode && nextNode != el) {
        index++;
        nextNode = treeWalker.nextNode();
    }

    return index;
}


/**
 * Returns element at given tree index
 * 
 * @param {Element} rootEl 
 * @param {Number} treeIndex
 * @return {Node}
 */
function getNodeAtTreeIndex(rootEl, treeIndex) {
    if (treeIndex == 0) return rootEl;
    if (! (treeIndex > 0) || treeIndex == Infinity) return; // not same as "<="

    var treeWalker = createTreeWalker(rootEl);

    var count = treeIndex;
    do {
        var node = treeWalker.nextNode();
    } while (--count && node); // same number of times as treeIndex (if not out of bounds)

    return node;
}


/**
 * Inserts an element inside root at a given index in tree (that has the same meaning as the index returned by `treeIndexOf` function). If element is already in the root's tree, it will be removed first and then moved to the passed treeIndex
 * Insertion at index 0 is not possible and will return undefined as it would mean replacing the root element.
 * 
 * @param {Element} rootEl element into which to insert
 * @param {Number} treeIndex index in DOM tree inside root element (see treeIndexOf)
 * @param {Element} el element to be inserted
 * @return {Boolean} true if was successfully inserted
 */
function insertAtTreeIndex(rootEl, treeIndex, el) {
    if (rootEl.contains(el))
        removeElement(el); // can't use removeChild as rootEl here is not an immediate parent

    if (! (treeIndex > 0)) return; // not same as "<="

    var node = getNodeAtTreeIndex(rootEl, treeIndex)
        , parent = node && node.parentNode || rootEl;
    parent.insertBefore(el, node);
    return true;
}


/**
 * Returns array of child indexes of element path inside root element in DOM tree using breadth first tree traversal.
 * Returns undefined if the element is not inside root element, 0 if the root element itself is passed.
 * 
 * @param  {Element} rootEl element to search
 * @param  {Element} el element to find the index of
 * @return {Array[Number]}
 */
function treePathOf(rootEl, el) {
    if (! (rootEl && rootEl.contains(el))) return;

    var treePath = []
        , node = rootEl;

    while (node != el) {
        var nodeIndex = _.findIndex(node.childNodes, function(child) {
            return child.contains(el);
        });
        treePath.push(nodeIndex);
        node = node.childNodes[nodeIndex];
    }

    return treePath;
}


/**
 * Returns element at given tree path
 * 
 * @param {Element} rootEl 
 * @param {Array[Number]} treePath
 * @param {Boolean} nearest return nearest possible node if exact node does not exist
 * @return {Node}
 */
function getNodeAtTreePath(rootEl, treePath, nearest) {
    if (!treePath) return;
    
    var len = treePath.length;
    if (len === 0) return rootEl;

    var node = rootEl;

    for (var i = 0; i < len; i++) {
        var children = node.childNodes;
        if (! children) {
            if (! nearest) node = undefined;
            break;
        }
        var childIndex = treePath[i]
            , child = children[childIndex];
        if (! child) {
            node = nearest
                    ? children[children.length - 1]
                    : undefined;
            break;
        }
        node = child;
    }

    return node;
}


/**
 * Inserts an element inside root at a given path in tree (that has the same meaning as the index returned by `treeIndexOf` function). If element is already in the root's tree, it will be removed first and then moved to the passed treeIndex
 * Insertion at index 0 is not possible and will return undefined as it would mean replacing the root element.
 * 
 * @param {Element} rootEl element into which to insert
 * @param {Number} treeIndex index in DOM tree inside root element (see treeIndexOf)
 * @param {Element} el element to be inserted
 * @return {Boolean} true if was successfully inserted
 */
function insertAtTreePath(rootEl, treePath, el, nearest) {
    var toNormalize = el.nodeType == Node.TEXT_NODE;
    if (rootEl.contains(el))
        removeElement(el); // can't use removeChild as rootEl here is not an immediate parent

    if (treePath.length == 0) return;

    var parent = getNodeAtTreePath(rootEl, treePath.slice(0, -1), nearest)
        , children = parent.childNodes;

    if (! children) {
        if (nearest) {
            parent = parent.parentNode;
            children = parent.childNodes;
        } else return;
    }

    var childIndex = treePath[treePath.length - 1]
        , child = children[childIndex];

    if (child) {
        parent.insertBefore(el, child);
        toNormalize && parent.normalize();
        return true;    
    } else if (children.length === 0 && (childIndex === 0 || nearest)) {
        parent.appendChild(el);
        toNormalize && parent.normalize();
        return true;
    } else {
        child = children[childIndex - 1];
        if (child || nearest) {
            parent.appendChild(el);
            toNormalize && parent.normalize();
            return true;
        }
    }
}


/**
 * Returns `true` if the first tree path points to a node which is before the other in the document order. 
 * @param  {Array}  path1   A treepath array
 * @param  {Array}  path2   A treepath array
 * @return {Boolean}
 */
function isTreePathBefore(path1, path2) {
    var i = 0
        , isBefore;
    if (!Array.isArray(path1) && Array.isArray(path2))
        return logger.error('isTreePathBefore: One or both paths are not valid treepath arrays.');

    for (i; i < path1.length; i++) {
        if (path1[i] < path2[i]) {
            isBefore = true;
            break;
        } else if (path1[i] > path2[i]) {
            isBefore = false;
            break;
        }
    }

    if (typeof isBefore == 'undefined')
        if (path1.length < path2.length)
            logger.warn('isTreePathBefore: One node is inside another');

    return isBefore || false;
}


/**
 * Converts non latin characters to HTML entity codes.
 * @param  {String} str the string to convert
 * @return {String}     the string with html entities
 */
function htmlEntities(str) {
    return str.replace(/[\u00A0-\u99999<>\&]/gim, function(i) {
        return '&#'+i.charCodeAt(0)+';';
    });
}


function createTreeWalker(el, whatToShow) {
    whatToShow = whatToShow || (NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    return document.createTreeWalker(el, whatToShow);
}


/**
 * Returns the reference to the window the node is in
 *
 * @param {Node} node
 * @return {Window}
 */
function getNodeWindow(node) {
    var doc = node.ownerDocument;
    return doc && (doc.defaultView || doc.parentWindow);
}



/**
 * do something for each nodes contained in a range
 * 
 * @param {range} a range
 * @param {cb} a function taking a node as argument

 */
function forEachNodesInRange(range, cb){
    var rangeContainer = range.commonAncestorContainer
        , doc = rangeContainer.ownerDocument;

    function isNodeInsideRange(node){
        var nodeRange = document.createRange();
        var isInside = false;
        nodeRange.selectNode(node);

        if (nodeRange.compareBoundaryPoints(Range.START_TO_START, range) != -1 
            && nodeRange.compareBoundaryPoints(Range.END_TO_END, range) != 1){
            isInside = true;
        }
        nodeRange.detach();
        return isInside;      
    }

    var treeWalker = doc.createTreeWalker(rangeContainer,
            NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);

    var currentNode;
    while (currentNode = treeWalker.nextNode()){
        if (isNodeInsideRange(currentNode)){
            cb(currentNode);
        }
    }
}

/**
 * get all components contained in a range
 * 
 * @param {range} a DOM range.
 */
function getComponentsFromRange(range) {
    var win = getNodeWindow(range.startContainer)
        , Component = win.milo.Component;

    var components = [];
    forEachNodesInRange(range, function (node){
        if (node.nodeType != Node.TEXT_NODE) {
            var comp = Component.getComponent(node);
            if (comp)
                components.push(comp);
        }
    });

    return components;
}

/**
 * delete a range
 * 
 * @param {range} delete a DOM range and all the components inside
 */
function deleteRangeWithComponents(range) {
    var components = getComponentsFromRange(range);

    components.forEach(function(comp) {
        comp.destroy(true);
    });

    range.deleteContents();
}

/**
 * check if two ranges are equivalent
 * 
 * @param {range} range1
 * @param {range} range2
 * @return {Boolean} are the two ranges equivalent
 */
function areRangesEqual(range1, range2){
    return range1.compareBoundaryPoints(Range.START_TO_START, range2) == 0 && range1.compareBoundaryPoints(Range.END_TO_END, range2) == 0;
}


/**
 * Adds a single pixel div to the body at a given x and y position. Useful for debugging position specific code.
 * @param {Number} x
 * @param {Number} y
 */
function addDebugPoint(x, y) {
    var dbEl = document.createElement('div');
    dbEl.setAttribute('style', 'width: 1px; height: 1px; position:fixed; left:'+x+'px; top:'+y+'px; background-color:red; z-index: 100');
    setTimeout(function() {document.body.appendChild(dbEl);}, 200);
}

},{"../config":64,"./logger":98,"mol-proto":109}],92:[function(require,module,exports){
'use strict';


var _ = require('mol-proto');


module.exports = domReady;

function domReady(func) { // , arguments
    var self = this
        , args = _.slice(arguments, 1);
    if (isReady.call(this))
        callFunc();
    else
        document.addEventListener('readystatechange', _.once(callFunc));

    function callFunc() {
        func.apply(self, args);
    }
}

domReady.isReady = isReady;


function isReady() {
    var readyState = document.readyState;
    return readyState == 'loading' ? false : readyState;
}

},{"mol-proto":109}],93:[function(require,module,exports){
'use strict';

var Component = require('../components/c_class')
    , Messenger = require('../messenger')
    , dragDropConfig = require('../config').dragDrop
    , componentMetaRegex = dragDropConfig.dataTypes.componentMetaRegex
    , jsonParse = require('./json_parse')
    , _ = require('mol-proto')
    , base32 = require('base32');


module.exports = DragDrop;


/**
 * Wrapper for event.dataTransfer of drag-drop HTML API
 *
 * @constructor
 * @param {event} DOM event
 * @return {DragDrop}
 */
function DragDrop(event) {
    this.event = event;
    this.dataTransfer = event.dataTransfer;
    this.types = event.dataTransfer.types;
}

/**
 * Usage:
 * var testDT = new DragDrop(event);
 * testDT.setComponentMeta(newComponent, {test: 'test', test2: 'test2'});
 * testDT.getComponentMeta();
 */

_.extend(DragDrop, {
    componentDataType: DragDrop$$componentDataType
});

_.extendProto(DragDrop, {
    isComponent: DragDrop$isComponent,
    getComponentState: DragDrop$getComponentState,
    setComponentState: DragDrop$setComponentState,
    getComponentMeta: DragDrop$getComponentMeta,
    setComponentMeta: DragDrop$setComponentMeta,
    getAllowedEffects: DragDrop$getAllowedEffects,
    setAllowedEffects: DragDrop$setAllowedEffects,
    getDropEffect: DragDrop$getDropEffect,
    setDropEffect: DragDrop$setDropEffect,
    isEffectAllowed: DragDrop$isEffectAllowed,
    getData: DragDrop$getData,
    setData: DragDrop$setData,
    clearData: DragDrop$clearData
});


function DragDrop$$componentDataType() {
    return dragDropConfig.dataTypes.component;
}


function DragDrop$isComponent() {
    return _.indexOf(this.types, DragDrop.componentDataType()) >= 0;
}


function DragDrop$getComponentState() {
    var dataType = DragDrop.componentDataType()
        , stateStr = this.dataTransfer.getData(dataType)
        , state = jsonParse(stateStr);

    return state;
}


function DragDrop$setComponentState(component, stateStr){
    if (! stateStr) {
        var state = component.getTransferState()
        stateStr = JSON.stringify(state)
    }
    var dataType = DragDrop.componentDataType();

    stateStr && this.dataTransfer.setData(dataType, stateStr);
    this.dataTransfer.setData('text/html', component.el.outerHTML);
    return stateStr;
}


function DragDrop$setComponentMeta(component, params, data) {
    var meta = _componentMeta(component);

    var paramsStr = _.toQueryString(params);
    var dataType = dragDropConfig.dataTypes.componentMetaTemplate
                    .replace('%class', _encode(meta.compClass || ''))
                    .replace('%name', _encode(meta.compName || ''))
                    .replace('%params', _encode(paramsStr || ''));

    if (data && typeof data == 'object') data = JSON.stringify(data);

    this.dataTransfer.setData(dataType, data || '');

    return dataType;
}


function _encode(str) {
    return base32.encode(str).toLowerCase();
}


function _componentMeta(component) {
    return component.transfer
            ? component.transfer.getComponentMeta()
            : { 
                compClass: component.constructor.name,
                compName: component.name
            };
}


function DragDrop$getComponentMeta() {
    var match;
    var metaDataType = _.find(this.types, function (dType) {
        match = dType.match(componentMetaRegex);
        return !!match;
    });
    if (!metaDataType) return;

    for (var i=1; i<4; i++)
        match[i] = base32.decode(match[i]);

    return {
        compClass: match[1],
        compName: match[2],
        params: _.fromQueryString(match[3]),
        metaDataType: metaDataType,
        metaData: _.jsonParse(this.dataTransfer.getData(metaDataType)) 
                    ? _.jsonParse(this.dataTransfer.getData(metaDataType)) 
                    : this.dataTransfer.getData(metaDataType)
    };
}


// as defined here: https://developer.mozilla.org/en-US/docs/DragDrop/Drag_Operations#dragstart
function DragDrop$getAllowedEffects() {
    return this.dataTransfer.effectAllowed;
}


function DragDrop$setAllowedEffects(effects) {
    this.dataTransfer.effectAllowed = effects;
}


function DragDrop$getDropEffect() {
    return this.dataTransfer.dropEffect;
}


function DragDrop$setDropEffect(effect) {
    this.dataTransfer.dropEffect = effect;
}


function DragDrop$isEffectAllowed(effect) {
    var allowedEffects = this.getAllowedEffects()
        , isCopy = effect == 'copy'
        , isMove = effect == 'move'
        , isLink = effect == 'link'
        , isAllowed = isCopy || isLink || isMove;

    switch (allowedEffects) {
        case 'copy':
        case 'move':
        case 'link':
            return allowedEffects == effect;
        case 'copyLink':
            return isCopy || isLink;
        case 'copyMove':
            return isCopy || isMove;
        case 'linkMove':
            return isLink || isMove;
        case 'all':
        case 'uninitialized':
            return isAllowed;
        case 'none':
            return false;
    }
}


function DragDrop$getData(dataType) {
    this.dataTransfer.getData(dataType);
}


function DragDrop$setData(dataType, dataStr) {
    this.dataTransfer.setData(dataType, dataStr);
}


function DragDrop$clearData(dataType) {
    this.dataTransfer.clearData(dataType);
}


/**
 * Drag drop service compensating for the lack of communication from drop target to drag source in DOM API
 */
var dragDropService = new Messenger;

var _currentDragDrop, _currentDragFacet;

_.extend(DragDrop, {
    service: dragDropService
});


dragDropService.onMessages({
    // data is DragDropDataTransfer instance
    // fired by Drag facet on "dragstart" event
    'dragdropstarted': onDragDropStarted, 
    // data is object with at least dropEffect property
    // fired by Drop facet on "drop" event
    'dragdropcompleted': onDragDropCompleted, 
    // fired by Drag facet on "dragend" event to complete drag
    // if drop happended in another window or if it was cancelled
    'completedragdrop': onCompleteDragDrop
});


_.extend(dragDropService, {
    getCurrentDragDrop: getCurrentDragDrop
});


function onDragDropStarted(msg, data) {
    _currentDragDrop = data.dragDrop;
    _currentDragFacet = data.dragFacet;
}


function onDragDropCompleted(msg, data) {
    _currentDragFacet && _currentDragFacet.postMessageSync('dragdropcompleted', data);
    _currentDragDrop = undefined;
    _currentDragFacet = undefined;
}


function onCompleteDragDrop(msg, data) {
    if (_currentDragDrop)
        dragDropService.postMessageSync('dragdropcompleted', data);
}


function getCurrentDragDrop() {
    return _currentDragDrop;
}

},{"../components/c_class":16,"../config":64,"../messenger":69,"./json_parse":97,"base32":105,"mol-proto":109}],94:[function(require,module,exports){
// <a name="utils-error"></a>
// milo.utils.error
// -----------

'use strict';

var _ = require('mol-proto');


// module exports error classes for all names defined in this array
var errorClassNames = ['AbstractClass', 'Mixin', 'Messenger', 'Component',
                       'Attribute', 'Binder', 'Loader', 'MailMessageSource', 'Facet',
                       'Scope', 'Model', 'DomFacet', 'EditableFacet',
                       'List', 'Connector', 'Registry', 'FrameMessageSource',
                       'Drop', 'Angular', 'StorageMessageSource'];

var error = {
    toBeImplemented: error$toBeImplemented,
    createClass: error$createClass
};

errorClassNames.forEach(function(name) {
    error[name] = error$createClass(name + 'Error');
});

module.exports = error;


function error$createClass(errorClassName) {
    var ErrorClass = _.makeFunction(errorClassName, 'message',
            'this.name = "' + errorClassName + '"; \
            this.message = message || "There was an  error";');
    _.makeSubclass(ErrorClass, Error);

    return ErrorClass;
}


function error$toBeImplemented() {
    throw new error.AbstractClass('calling the method of an absctract class');
}

},{"mol-proto":109}],95:[function(require,module,exports){
'use strict';


var Component = require('../components/c_class')
    , BindAttribute = require('../attributes/a_bind')
    , binder = require('../binder')
    , domUtils = require('./dom')
    , logger = require('./logger')
    , check = require('./check')
    , _ = require('mol-proto');


var createRangePaths = _createNodesAndPathsFunc(domUtils.treePathOf);
var createRangeNodes = _createNodesAndPathsFunc(domUtils.getNodeAtTreePath);


var fragmentUtils = module.exports = {
    getState: fragment_getState,
    getStateAsync: fragment_getStateAsync,

    expandRangeToSiblings: expandRangeToSiblings,
    getRangeSiblings: getRangeSiblings,
    createRangeFromSiblings: createRangeFromSiblings,
    createRangePaths: createRangePaths,
    createRangeNodes: createRangeNodes,
    createRangeFromNodes: createRangeFromNodes
};



/**
 * Creates an object with the state of wrapped range with components, including partially selected. The range will be cloned and wrapped in component with container facet before getting its state.
 * This function will log error and return undefined if range has no common ancestor that has component with container facet
 * 
 * @param {Range} range DOM Range instance
 * @param {Boolean} renameChildren optional parameter, `true` to rename fragment child components
 * @param {String} wrapperClassName optional parameter to wrap in a custom component class
 * @return {Object}
 */
function fragment_getState(range, renameChildren, wrapperClassName) {
    var rangeContainer = _getRangeContainer(range);
    if (! rangeContainer) {
        logger.error('fragment.getState: range has no common container');
        return;
    }

    var frag = range.cloneContents()
        , wrapper = _wrapFragmentInContainer(frag, wrapperClassName);

    _transferStates(rangeContainer, wrapper);
    if (renameChildren) _renameChildren(wrapper);
    var wrapperState = wrapper.getState();
    _.deferMethod(wrapper, 'destroy');
    return wrapperState;
}


/**
 * Creates an object with the state of wrapped range with components, including partially selected. The range will be cloned and wrapped in component with container facet before getting its state.
 * This function will return result and any error via callback.
 * 
 * @param {Range} range DOM Range instance
 * @param {Boolean} renameChildren optional parameter, `true` to rename fragment child components
 * @param {Function} callback always the last parameter, optional parameters can be dropped; result is passed via callback with any error as first parameter
 */
function fragment_getStateAsync(range, renameChildren, callback) {
    try {
        var rangeContainer = _getRangeContainer(range);
        if (! rangeContainer) {
            callback(new Error('fragment.getState: range has no common container'));
            return; // do NOT connect return to previous callback, getState should return undefined
        }

        if (typeof renameChildren == 'function') {
            callback = renameChildren;
            renameChildren = false;
        }

        var frag = range.cloneContents()
            , wrapper = _wrapFragmentInContainer(frag);

        _transferStates(rangeContainer, wrapper);
        _.defer(function() {
            wrapper.broadcast('stateready');
            _.defer(function() {
                if (renameChildren) _renameChildren(wrapper);
                var wrapperState = wrapper.getState();
                wrapper.destroy();
                callback(null, wrapperState);
            });
        });
    } catch (err) {
        callback(err);
    }
}


function _wrapFragmentInContainer(frag, wrapperClassName) {
    var wrapEl = document.createElement('div')
        , attr = new BindAttribute(wrapEl);

    _.extend(attr, {
        compClass: wrapperClassName || 'Component',
        compFacets: wrapperClassName ? [] : ['container'],
        compName: 'wrapper'
    });

    attr.decorate();

    wrapEl.appendChild(frag);
    var scope = binder(wrapEl);
    return scope.wrapper;
}


function _getRangeContainer(range) {
    var el = domUtils.containingElement(range.commonAncestorContainer);
    return Component.getContainingComponent(el, true, 'container');
}


function _transferStates(fromComp, toComp) {
    var fromScope = fromComp.container.scope;
    toComp.container.scope._each(function(toChildComp, name) {
        var fromChildComp = fromScope[name];
        if (! fromChildComp) return logger.error('fragment.getState: conponent', name, 'not found in range');
        var state = fromChildComp._getState(true);
        toChildComp.setState(state);
    });
}


function _renameChildren(comp) {
    comp.container.scope._each(function(child) {
        child.rename();
    });
}



function expandRangeToSiblings(range) {
    var siblings = getRangeSiblings(range);
    var range = createRangeFromSiblings(siblings);
    return range;
}

function createRangeFromSiblings(nodes) {
    var range = document.createRange();
    if (nodes.siblings) {
        range.setStartBefore(nodes.start);
        range.setEndAfter(nodes.end);
    } else
        range.selectNode(nodes.start);
    return range;
}

function getRangeSiblings(range) {
    var containerNode = range.commonAncestorContainer
        , startNode = range.startContainer
        , endNode = range.endContainer;

    if (startNode == endNode) {
        if (startNode != containerNode) logger.error('deleteSelectionCommand logical error: start==end, but container is different');
        return { siblings: false, start: startNode };
    }

    if (startNode == containerNode || endNode == containerNode)
        return { siblings: false, start: containerNode };

    var startSibling = _findContainingChild(containerNode, startNode);
    var endSibling = _findContainingChild(containerNode, endNode);

    if (startSibling && endSibling) {
        if (startSibling == endSibling) {
            logger.error('deleteSelectionCommand logical error: same siblings');
            return { siblings: false, start: startSibling };
        } else
            return { siblings: true, start: startSibling, end: endSibling };
    }
}



function createRangeFromNodes(nodes) {
    var range = document.createRange();
    if (nodes.siblings) {
        range.setStartBefore(nodes.start);
        range.setEndAfter(nodes.end);
    } else
        range.selectNode(nodes.start);
    return range;
}



function _findContainingChild(containerNode, selNode) {
    return _.find(containerNode.childNodes, function(node) {
        return node.contains(selNode);
    });
}




function _createNodesAndPathsFunc(func) {
    return function(rootEl, fromObj) {
        var toObj = {
            siblings: fromObj.siblings,
            start: func(rootEl, fromObj.start)
        };
        if (toObj.siblings)
            toObj.end = func(rootEl, fromObj.end);
        return toObj;
    }
}



},{"../attributes/a_bind":5,"../binder":9,"../components/c_class":16,"./check":88,"./dom":91,"./logger":98,"mol-proto":109}],96:[function(require,module,exports){
'use strict';

/**
 * `milo.util`
 */
var util = {
    logger: require('./logger'),
    request: require('./request'),
    promise: require('./promise'),
    check: require('./check'),
    error: require('./error'),
    count: require('./count'), // deprecated
    uniqueId: require('./count'),
    componentName: require('./component_name'),
    dom: require('./dom'),
    selection: require('./selection'),
    fragment: require('./fragment'),
    jsonParse: require('./json_parse'),
    storage: require('./storage'),
    domReady: require('./domready'),
    dragDrop: require('./dragdrop'),
    dialog: require('../components/ui/bootstrap/Dialog'),
    alert: require('../components/ui/bootstrap/Alert'),
    doT: require('dot')
};

module.exports = util;

},{"../components/ui/bootstrap/Alert":61,"../components/ui/bootstrap/Dialog":62,"./check":88,"./component_name":89,"./count":90,"./dom":91,"./domready":92,"./dragdrop":93,"./error":94,"./fragment":95,"./json_parse":97,"./logger":98,"./promise":100,"./request":101,"./selection":102,"./storage":103,"dot":107}],97:[function(require,module,exports){
'use strict';


module.exports = jsonParse;


/**
 * `milo.util.jsonParse`
 * Safe JSON.parse, returns undefined if JSON.parse throws an exception
 *
 * @param {String} str - JSON string representation of object
 * @return {Object|undefined}
 */
function jsonParse(str) {
    try {
        return JSON.parse(str);
    } catch (e) {}
}

},{}],98:[function(require,module,exports){
'use strict';

// <a name="utils-logger"></a>
// milo.utils.logger
// -----------

// Application logger that has error, warn, info and debug
// methods, that can be suppressed by setting log level.

// Properties:

// - level

//   - 0 - error
//   - 1 - warn
//   - 2 - info
//   - 3 - debug (default)

// - enabled

//   true by default. Set to false to disable all logging in browser console.


var Logger = require('./logger_class');

var logger = new Logger({ level: 3 });

module.exports = logger;

},{"./logger_class":99}],99:[function(require,module,exports){
'use strict';

// ### Logger Class

// Properties:

// - level

//   - 0 - error
//   - 1 - warn
//   - 2 - info
//   - 3 - debug (default)

// - enabled

//   true by default. Set to false to disable all logging in browser console.


var _ = require('mol-proto');


/**
 * Log levels.
 */

var levels = [
    'error',
    'warn',
    'info',
    'debug'
];

var maxLevelLength = Math.max.apply(Math, levels.map(function(level) { return level.length; }));

/**
 * Colors for log levels.
 */

var colors = [
    31,
    33,
    36,
    90
];

/**
 * Pads the nice output to the longest log level.
 */
function pad(str) {
    if (str.length < maxLevelLength)
        return str + new Array(maxLevelLength - str.length + 1).join(' ');

    return str;
};


function colored(str, color) {
    return '\x1B[' + color + 'm' + str + ' -\x1B[39m';
}


var DEFAULT_OPTIONS = {
    level: 3,
    throwLevel: -1, // never throw
    enabled: true,
    logPrefix: ''
}


/**
 * Logger (console).
 *
 * @api public
 */
var Logger = function (opts) {
    _.extend(this, DEFAULT_OPTIONS);
    _.extend(this, opts || {});
};


/**
 * Log method.
 *
 * @api public
 */

Logger.prototype.log = function (type) {
    var index = levels.indexOf(type);

    if (! this.enabled || index > this.level)
        return this;

    var args = _.slice(arguments, 1);

    if (index <= this.throwLevel)
        throw new Error([this.logPrefix, type + ':'].concat(args).join(' '));

    console.log.apply(
          console
        , [ this.logPrefixColor
              ? '   ' + colored(this.logPrefix, this.logPrefixColor)
              : this.logPrefix,
            (this.colors
              ? ' ' + colored(pad(type), colors[index])
              : type) + ':'
          ].concat(args)
    );

    return this;
};

/**
 * Generate methods.
 */

levels.forEach(function (name) {
    Logger.prototype[name] = function () {
        this.log.apply(this, [name].concat(_.toArray(arguments)));
    };
});


module.exports = Logger;

},{"mol-proto":109}],100:[function(require,module,exports){
'use strict';

var _ = require('mol-proto');

module.exports = Promise;


/**
 * Simple Promise object to manage asynchronous data delivery
 * Can't be chained like Q promises (here, [then](#Promise$then) and [error](#Promise$error) always simply return original promise), but can be transformed to another promise using [transform](#Promise$transform) method with data transformation function.
 * Another differences with Q:
 *
 * - `then` accepts only success callback
 * - all callbacks are passed three parameters: error, data and dataSource (argument passed to Promise constructor)
 *
 * @return {Promise}
 */
function Promise(dataSource) {
    this.data = undefined;
    this.dataError = undefined;
    this.dataSource = dataSource;
    this._thenQueue = [];
    this._errorQueue = [];
}


/**
 * Promise class methods
 * 
 * - [processData](#processData)
 */
_.extend(Promise, {
    transformData: Promise$$transformData,
    thenData: Promise$$thenData,
    isPromise: Promise$$isPromise
});


/**
 * Promise instance methods
 * 
 * - [then](#Promise$then) - register callback to be called when promise data is set
 * - [error](#Promise$error) - register callback to be called when promise dataError is set
 * - [setData](#Promise$setData) - set data and dataError of the promise
 * - [transform](#Promise$transform) - create a new promise with data transformation
 */
_.extendProto(Promise, {
    then: Promise$then,
    error: Promise$error,
    setData: Promise$setData,
    transform: Promise$transform
});


/**
 * Passes data to function; if promise does it when promise gets resolved
 * Returns transformed promise if promise was passed, processed data otherwise
 * 
 * @param {Promise|Any} data data to be passed
 * @param {Function} transformFunc
 * @return {Promise|Any}
 */
function Promise$$transformData(data, transformFunc) {
    if (Promise$$isPromise(data))
        return data.transform(transformFunc);
    else
        return transformFunc(data);
}


/**
 * If promise is passed, resolves it, simply calls funciton with data otherwise
 * 
 * @param {Promise|Any} data data to be passed
 * @param {Function} thenFunc
 * @return {Promise|Any}
 */
function Promise$$thenData(data, thenFunc) {
    if (Promise$$isPromise(data))
        return data.then(thenFunc);
    else
        return thenFunc(null, data);
}


function Promise$$isPromise(data) {
    try { var className = data.constructor.name; } catch(e) {}
    return className == 'Promise'
        && _.everyKey(Promise.prototype, function(method, methodName) {
            return typeof data[methodName] == 'function';
        });
}


/**
 * Promise instance method
 * Calls callback when data arrives if there is no error (or on next tick if data had arrived before)
 *
 * @param {Function} callback
 */
function Promise$then(callback) {
    if (! this.dataError) {
        if (this.data)
            _.defer(callback, null, this.data, this.dataSource);
        else
            this._thenQueue.push(callback);
    }

    return this;
}


/**
 * Promise instance method
 * Calls callback if there is data error (or on next tick if error had happened before)
 *
 * @param {Function} callback
 */
function Promise$error(callback) {
    if (this.dataError)
        _.defer(callback, this.dataError, this.data, this.dataSource);
    else if (! this.data)
        this._errorQueue.push(callback);

    return this;
}


/**
 * Sets promise data and error and iterates registered callbacks queues
 *
 * @param {Any} error data error
 * @param {Any} data data
 */
function Promise$setData(error, data) {
    this.dataError = error;
    this.data = data;

    var queue = error ? this._errorQueue : this._thenQueue;

    var self = this;
    _.defer(function() {
        queue.forEach(function(callback) {
            callback(error, data, self.request);
        });
        self._errorQueue.length = 0;
        self._thenQueue.length = 0;
    });
}


/**
 * Returns another promise that would call its callbacks with transformed data
 *
 * @param {Function} transformDataFunc data transformation function
 * @return {Promise}
 */
function Promise$transform(transformDataFunc) {
    var promise = new Promise(this);
    this
    .then(function(error, data) {
        try {
            var transformedData = transformDataFunc(data);
            promise.setData(error, transformedData);
        } catch (e) {
            promise.setData(e);
        }
    })
    .error(function(error, data) {
        promise.setData(error, data);
    });
    return promise;
}

},{"mol-proto":109}],101:[function(require,module,exports){
'use strict';

// milo.utils.request
// -----------

// Convenience functions wrapping XMLHTTPRequest functionality.

// ```
// var request = milo.utils.request
//     , opts: { method: 'GET' };

// request(url, opts, function(err, data) {
//     logger.debug(data);
// });

// request.get(url, function(err, data) {
//     logger.debug(data);
// });
// ```

// Only generic request and get, json, post convenience methods are currently implemented.


var _ = require('mol-proto')
    , count = require('./count')
    , Promise = require('./promise')
    , config = require('../config')
    , logger = require('./logger');

module.exports = request;


function onReady(req, callback, promise) {
    if (req.readyState == 4) {
        if (req.statusText.toUpperCase() == 'OK' ) {
            callback && callback(null, req.responseText, req);
            promise.setData(null, req.responseText);
        } else {
            callback && callback(req.status, req.responseText, req);
            promise.setData(req.status, req.responseText);
        }
    }
}


function request(url, opts, callback) {
    var req = new XMLHttpRequest();
    req.open(opts.method, url, true);
    req.setRequestHeader('Content-Type', opts.contentType || 'application/json;charset=UTF-8');

    var promise = new Promise(req);

    req.onreadystatechange = _.partial(onReady, req, callback, promise);
    req.send(JSON.stringify(opts.data));

    return promise;
}


_.extend(request, {
    get: request$get,
    post: request$post,
    json: request$json,
    jsonp: request$jsonp,
    file: request$file
});


function request$get(url, callback) {
    return request(url, { method: 'GET' }, callback);
}


function request$post(url, data, callback) {
    return request(url, { method: 'POST', data: data }, callback);
}


function request$json(url, callback) {
    var promise = request(url, { method: 'GET' });

    var jsonPromise = promise.transform(JSON.parse.bind(JSON));

    if (callback)
        jsonPromise.then(callback).error(callback);

    return jsonPromise;
}


function request$jsonp(url, callback) {
    var script = document.createElement('script'),
        promise = new Promise(script),
        head = window.document.head,
        uniqueCallback = 'ML_JSONP_' +  count();

    setTimeout(function() {
        if (window[uniqueCallback]) {
            callback && callback(new Error('No JSONP response or no callback in response'));
            logger.error('JSONP response after timeout');
            cleanUp();
        }
    }, config.request.jsonpTimeout * 1000);

    window[uniqueCallback] = function (result) {
        callback && callback(null, result);
        promise.setData(null, result);
        cleanUp();
    };
    
    script.type = 'text/javascript';
    script.src = url + (url.indexOf('?') == -1 ? '?' : '&') + 'callback=' + uniqueCallback;

    head.appendChild(script);

    return promise;


    function cleanUp() {
        head.removeChild(script);
        delete window[uniqueCallback];
    }
}


function request$file(url, data, callback) {
    var req = new XMLHttpRequest();
    req.open('POST', url, true);

    var promise = new Promise();

    var formData = new FormData();
    formData.append('file', data);

    req.onreadystatechange = _.partial(onReady, req, callback, promise);

    req.send(formData);
}


},{"../config":64,"./count":90,"./logger":98,"./promise":100,"mol-proto":109}],102:[function(require,module,exports){
'use strict';


var domUtils = require('../dom')
    , containingElement = domUtils.containingElement
    , setCaretPosition = domUtils.setCaretPosition
    , getComponentsFromRange = domUtils.getComponentsFromRange
    , deleteRangeWithComponents = domUtils.deleteRangeWithComponents
    , logger = require('../logger')
    , Component = require('../../components/c_class')
    , _ = require('mol-proto');

module.exports = TextSelection;


/**
 * Text selection class.
 * Serves as a helper to manage current selection
 * The object cannot be reused, if the selection changes some of its properties may contain information related to previous selection
 *
 * @param {Window} win window in which text selection is processed
 */
function TextSelection(win) {
    if (! this instanceof TextSelection)
        return new TextSelection(win);
    this.window = win || window;
    this.init();
}


/**
 * TextSelection instance method
 * Returns selection start element
 *
 * @return {Element|null}
 */
var TextSelection$startElement = 
    _.partial(_getElement, '_startElement', 'startContainer');


/**
 * TextSelection instance method
 * Returns selection end element
 *
 * @return {Element|null}
 */
var TextSelection$endElement = 
    _.partial(_getElement, '_endElement', 'endContainer');


/**
 * TextSelection instance method
 * Returns selection end element
 *
 * @return {Element|null}
 */
var TextSelection$containingElement = 
    _.partial(_getElement, '_containingElement', 'commonAncestorContainer');


/**
 * TextSelection instance method
 * Returns selection start Component
 *
 * @return {Component}
 */
var TextSelection$startComponent = 
    _.partial(_getComponent, '_startComponent', 'startElement');


/**
 * TextSelection instance method
 * Returns selection end Component
 *
 * @return {Component}
 */
var TextSelection$endComponent = 
    _.partial(_getComponent, '_endComponent', 'endElement');


/**
 * TextSelection instance method
 * Returns selection end Component
 *
 * @return {Component}
 */
var TextSelection$containingComponent = 
    _.partial(_getComponent, '_containingComponent', 'containingElement');


_.extendProto(TextSelection, {
    init: TextSelection$init,
    text: TextSelection$text,
    textNodes: TextSelection$textNodes,
    clear: TextSelection$clear,

    startElement: TextSelection$startElement,
    endElement: TextSelection$endElement,
    containingElement: TextSelection$containingElement,

    startComponent: TextSelection$startComponent,
    endComponent: TextSelection$endComponent,
    containingComponent: TextSelection$containingComponent,

    containedComponents: TextSelection$containedComponents,
    eachContainedComponent: TextSelection$eachContainedComponent,
    del: TextSelection$del,
    _getPostDeleteSelectionPoint: _getPostDeleteSelectionPoint,
    _selectAfterDelete: _selectAfterDelete,

    getRange: TextSelection$getRange,
    getState: TextSelection$getState,
    getNormalizedRange: TextSelection$$getNormalizedRange,
    getDirection: TextSelection$$getDirection
});


_.extend(TextSelection, {
    createFromRange: TextSelection$$createFromRange,
    createFromState: TextSelection$$createFromState,
    createStateObject: TextSelection$$createStateObject
});


/**
 * TextSelection instance method
 * Initializes TextSelection from the current selection
 */
function TextSelection$init() {
    this.selection = this.window.getSelection();
    if (this.selection.rangeCount)
        this.range = this.selection.getRangeAt(0);
    this.isCollapsed = this.selection.isCollapsed;
}


/**
 * TextSelection instance method
 * Retrieves and returns selection text
 *
 * @return {String}
 */
function TextSelection$text() {
    if (! this.range) return undefined;

    if (! this._text)
        this._text = this.range.toString();

    return this._text;
}


/**
 * TextSelection instance method
 * Retrieves and returns selection text nodes
 *
 * @return {Array[Node]}
 */
function TextSelection$textNodes() {
    if (! this.range) return undefined;

    if (! this._textNodes)
        this._textNodes = _getTextNodes.call(this);
    return this._textNodes;
}


function TextSelection$clear() {
    this.selection.removeAllRanges();
}


/**
 * Retrieves text and text nodes from selection saving them on properties of object
 *
 * @private
 * @param {TextSelection} this
 */
function _getTextNodes() {
    // list of selected text nodes
    var textNodes = [];

    if (this.isCollapsed)
        return textNodes;

    // create TreeWalker to traverse the tree to select all text nodes
    var selStart = this.range.startContainer
        , selEnd = this.range.endContainer
        , rangeContainer = this.range.commonAncestorContainer;

    var treeWalker = this.window.document.createTreeWalker(rangeContainer, NodeFilter.SHOW_TEXT);
    var node = treeWalker.currentNode = selStart;

    // traverse DOM tree to collect all selected text nodes
    while (node && (! inEnd || selEnd.contains(node))) {
        textNodes.push(node);
        var inEnd = inEnd || selEnd.contains(node);
        node = treeWalker.nextNode();
    }
    return textNodes;
}


/**
 * Retrieves and returns start/end element from selection saving them on properties of object
 *
 * @private
 * @param {TextSelection} this
 * @return {Element|null}
 */
function _getElement(thisPropName, rangePropName) {
    if (! this.range) return undefined;

    if (typeof this[thisPropName] == 'undefined')
        this[thisPropName] = containingElement(this.range[rangePropName]);
    return this[thisPropName];
}


/**
 * Retrieves and returns start/end component from selection saving them on properties of object
 *
 * @private
 * @param {TextSelection} this
 * @return {Component}
 */
function _getComponent(thisPropName, elMethodName) {
    if (! this.range) return undefined;

    if (typeof this[thisPropName] == 'undefined')
        this[thisPropName] = Component.getContainingComponent(this[elMethodName]());
    return this[thisPropName];
}


function TextSelection$containedComponents() {
    if (this._containedComponents)
        return this._containedComponents;

    var components = this._containedComponents = [];

    if (this.isCollapsed || ! this.range) return components;

    return getComponentsFromRange(this.range);
}


function TextSelection$eachContainedComponent(callback, thisArg) {
    if (this.isCollapsed || ! this.range) return;

    var components = this.containedComponents();

    components.forEach(callback, thisArg);
}


/**
 * TextSelection instance method
 * Deletes the current selection and all components in it
 * 
 * @param {Boolean} selectEndContainer set to true if the end container should be selected after deletion
 */
function TextSelection$del(selectEndContainer) {
    if (this.isCollapsed || ! this.range) return;

    var selPoint = this._getPostDeleteSelectionPoint(selectEndContainer);

    deleteRangeWithComponents(this.range);

    this._selectAfterDelete(selPoint);
    selPoint.node.parentNode.normalize();
}


function _getPostDeleteSelectionPoint(selectEndContainer) {
    var selNode = this.range.startContainer;
    var selOffset = this.range.startOffset;
    if (selectEndContainer && this.range.startContainer != this.range.endContainer) {
        selNode = this.range.endContainer;
        selOffset = 0;
    }
    return { node: selNode, offset: selOffset };
}


function _selectAfterDelete(selPoint) {
    var selNode = selPoint.node
        , selOffset = selPoint.offset;
    selNode.textContent = selNode.textContent.trimRight();
    if (selNode && !selNode.nodeValue)
        selNode.nodeValue = '\u00A0'; //non-breaking space, \u200B for zero width space;
    
    var position = selOffset > selNode.length ? selNode.length : selOffset;
    setCaretPosition(selNode, position);
}


/**
 * Returns selection range
 *
 * @return {Range}
 */
function TextSelection$getRange() {
    return this.range;
}


/**
 * Stores selection window, nodes and offsets in object
 */
function TextSelection$getState(rootEl) {
    var r = this.range;
    var doc = rootEl.ownerDocument
        , win = doc.defaultView || doc.parentWindow;
    if (!r) return { window: win };
    return TextSelection.createStateObject(rootEl, r.startContainer, r.startOffset, r.endContainer, r.endOffset);
}


function TextSelection$$createStateObject(rootEl, startContainer, startOffset, endContainer, endOffset) {
    endContainer = endContainer || startContainer;
    endOffset = endOffset || startOffset;
    var doc = rootEl.ownerDocument
        , win = doc.defaultView || doc.parentWindow;
    return {
        window: win,
        rootEl: rootEl,
        start: _getSelectionPointState(rootEl, startContainer, startOffset),
        end: _getSelectionPointState(rootEl, endContainer, endOffset)
    };
}


function _getSelectionPointState(rootEl, node, offset) {
    var treePath = domUtils.treePathOf(rootEl, node);
    if (! treePath) logger.error('Selection point is outside of root element');
    return {
        treePath: treePath,
        offset: offset
    };
}


/**
 * Restores actual selection to the stored range
 */
function TextSelection$$createFromState(state) {
    var domUtils = state.window.milo.util.dom;

    if (state.rootEl && state.start && state.end) {
        var startNode = _selectionNodeFromState(state.rootEl, state.start)
            , endNode = _selectionNodeFromState(state.rootEl, state.end);

        try {
            domUtils.setSelection(startNode, state.start.offset, endNode, state.end.offset);
            return new TextSelection(state.window);
        } catch(e) {
            logger.error('Text selection: can\'t create selection', e, e.message);
        }
    } else {
        domUtils.clearSelection(state.window);
        return new TextSelection(state.window);
    }
}


function _selectionNodeFromState(rootEl, pointState) {
    var node = domUtils.getNodeAtTreePath(rootEl, pointState.treePath);
    if (! node) logger.error('TextSelection createFromState: no node at treePath');
    return node;
}


/**
 * Creates selection from passed range
 * 
 * @param {Range} range
 * @param {Boolean} backward
 *
 * @return {TextSelection}
 */
function TextSelection$$createFromRange(range, backward) {
    var win = range.startContainer.ownerDocument.defaultView
        , sel = win.getSelection()
        , endRange;

    sel.removeAllRanges();

    if (backward){
        endRange = range.cloneRange();
        endRange.collapse(false);

        sel.addRange(endRange);
        sel.extend(range.startContainer, range.startOffset)        
    }
    else {
        sel.addRange(range);
    }

    return new TextSelection(win);
}

/**
 * Returns a normalized copy of the range
 * If you triple click an item, the end of the range is positioned at the beginning of the NEXT node.
 * this function returns a range with the end positioned at the end of the last textnode contained 
 * inside a component with the "editable" facet
 * 
 * @return {range}
 */
function TextSelection$$getNormalizedRange(){
    var doc = this.range.commonAncestorContainer.ownerDocument
        , tw, previousNode
        , newRange = this.range.cloneRange();

    if (newRange.endContainer.nodeType !== Node.TEXT_NODE) {
        tw = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
        tw.currentNode = newRange.endContainer;
        previousNode = tw.previousNode();
        newRange.setEnd(previousNode, previousNode.length);
    }

    return newRange;
}

/**
 * get the direction of a selection
 *
 * 1 forward, -1 backward, 0 no direction, undefined one of the node is detached or in a different frame
 *
 * @return {-1|0|1|undefined}
 */
function TextSelection$$getDirection(){
    return domUtils.getSelectionDirection(this.selection);    
}


},{"../../components/c_class":16,"../dom":91,"../logger":98,"mol-proto":109}],103:[function(require,module,exports){
'use strict';


var DOMStorageError = require('../error').createClass('DomStorageError')
    , Messenger = require('../../messenger')
    , StorageMessageSource = require('./msg_src')
    , config = require('../../config')
    , jsonParse = require('../json_parse')
    , _ = require('mol-proto')
    , check = require('../check')
    , Match = check.Match;


module.exports = DOMStorage;


// shared keys stored by all instances, include key prefixes
var _storedKeys = {
    true: {}, // session storage
    false: {} // local storage
};


/**
 * DOMStorage class to simplify storage and retrieval of multiple items with types preservation to DOM storage (localStorage and sessionStorage).
 * Types will be stored in the key created from value keys with appended `milo.config.domStorage.typeSuffix`
 * 
 * @param {String} keyPrefix prefix that will be added to all keys followed by `milo.config.domStorage.prefixSeparator` ("/" by default).
 * @param {Boolean} sessionOnly true to use sessionStorage. localStorage will be used by default.
 * @param {Window} win window to work in
 */
function DOMStorage(keyPrefix, sessionOnly, win) {
    if (typeof window == 'undefined') return;
    win = win || window;

    keyPrefix = config.domStorage.root + 
                (keyPrefix
                    ? keyPrefix + config.domStorage.prefixSeparator
                    : '');

    _.defineProperties(this, {
        keyPrefix: keyPrefix,
        sessionOnly: !! sessionOnly,
        window: win,
        _storage: sessionOnly ? win.sessionStorage : win.localStorage,
        _typeSuffix: config.domStorage.typeSuffix,
        _keys: {}
    });
}


_.extendProto(DOMStorage, {
    get: DOMStorage$get,
    set: DOMStorage$set,
    remove: DOMStorage$remove,
    hasItem: DOMStorage$hasItem,
    getItem: DOMStorage$getItem,
    setItem: DOMStorage$setItem,
    removeItem: DOMStorage$removeItem,
    _storageKey: DOMStorage$_storageKey,
    _domStorageKey: DOMStorage$_domStorageKey,
    getAllKeys: DOMStorage$getAllKeys,
    getAllItems: DOMStorage$getAllItems,
    createMessenger: DOMStorage$createMessenger
});


var _sessionStorage = new DOMStorage('', true)
    , _localStorage = new DOMStorage('', false);

var _domStorage = {
        true: _sessionStorage,
        false: _localStorage
    };

_.extend(DOMStorage, {
    registerDataType: DOMStorage$$registerDataType,
    local: _localStorage,
    session: _sessionStorage,
    storage: _domStorage,
    _storedKeys: _storedKeys // exposed for testing
});


/**
 * Sets data to DOM storage. `this.keyPrefix` is prepended to keys.
 * 
 * @param {Object} data single object can be passed in which case keys will be used as keys in local storage.
 * @param {List} arguments alternatively just the list of arguments can be passed where arguments can be sequentially used as keys and values.
 */
function DOMStorage$set(data) { // or arguments
    if (typeof data == 'object')
        _.eachKey(data, function(value, key) {          
            this.setItem(key, value);
        }, this);
    else {
        var argsLen = arguments.length;
        if (argsLen % 2)
            throw new DomStorageError('DOMStorage: set should have even number of arguments or object');

        for (var i = 0; i < argsLen; i++) {
            var key = arguments[i]
                , value = arguments[++i];

            this.setItem(key, value);
        }
    }
}


/**
 * Gets data from DOM storage. `this.keyPrefix` is prepended to passed keys, but returned object will have keys without root keys.
 * 
 * @param {List} arguments keys can be passed as strings or arrays of strings
 * @returns {Object}
 */
function DOMStorage$get() { // , ... arguments
    var data = {};
    _.deepForEach(arguments, function(key) {
        data[key] = this.getItem(key);
    }, this);
    return data;
}


/**
 * Removes keys from DOM storage. `this.keyPrefix` is prepended to passed keys.
 * 
 * @param {List} arguments keys can be passed as strings or arrays of strings
 */
function DOMStorage$remove() { //, ... arguments
    _.deepForEach(arguments, function(key) {
        this.removeItem(key);
    }, this);
}


/**
 * Check for presence of single item in DOM storage. `this.keyPrefix` is prepended to passed key.
 * 
 * @param {String} key
 * @return {Boolean}
 */
function DOMStorage$hasItem(key) {
    var pKey = this._storageKey(key);
    return this._storage.getItem(pKey) != null;
}


/**
 * Gets single item from DOM storage prepending `this.keyPrefix` to passed key.
 * Reads type of the originally stored value from `key + this._typeSuffix` and converts data to the original type.
 * 
 * @param {String} key
 * @return {Any}
 */
function DOMStorage$getItem(key) {
    var pKey = this._storageKey(key);
    var dataType = _getKeyDataType.call(this, pKey);
    var valueStr = this._storage.getItem(pKey);
    var value = _parseData(valueStr, dataType);
    return value;
}


/**
 * Sets single item to DOM storage prepending `this.keyPrefix` to passed key.
 * Stores type of the stored value to `key + this._typeSuffix`.
 * 
 * @param {String} key
 * @return {Any}
 */
function DOMStorage$setItem(key, value) {
    var pKey = this._storageKey(key);
    var dataType = _setKeyDataType.call(this, pKey, value);
    var valueStr = _serializeData(value, dataType);
    this._storage.setItem(pKey, valueStr);
    this._keys[key] = true;
    _domStorage[this.sessionOnly]._keys[pKey] = true;
}


/**
 * Removes single item from DOM storage prepending `this.keyPrefix` to passed key.
 * Type of the stored value (in `key + this._typeSuffix` key) is also removed.
 * 
 * @param {String} key
 * @return {Any}
 */
function DOMStorage$removeItem(key) {
    var pKey = this._storageKey(key);
    this._storage.removeItem(pKey);
    _removeKeyDataType.call(this, pKey)
    delete this._keys[key];
    delete _domStorage[this.sessionOnly]._keys[pKey];
}


/**
 * Returns the array of all keys stored by this instance of DOMStorage
 *
 * @return {Array} 
 */
function DOMStorage$getAllKeys() {
    var storedKeys = Object.keys(this._keys);
    var keysInStorage = storedKeys.filter(function(key) {
        if (this.hasItem(key)) return true;
        else delete this._keys[key];
    }, this);
    return keysInStorage;
}


/**
 * Returns the map with all keys and values (deserialized) stored using this instance of DOMStorage
 * 
 * @return {Object}
 */
function DOMStorage$getAllItems() {
    return this.get(this.getAllKeys());
}


/**
 * Returns prefixed key for DOM storage for given unprefixed key.
 * 
 * @param {String} key
 * @return {String}
 */
function DOMStorage$_storageKey(key) {
    return this.keyPrefix + key;
}


/**
 * Returns unprefixed key to be used with this instance of DOMStorage fir given actual key in storage
 * If key has different prefix from the keyPrefix returns undefined
 * 
 * @param {String} storageKey actual key in local/session storage
 * @return {String}
 */
function DOMStorage$_domStorageKey(storageKey) {
    if (storageKey.indexOf(this._typeSuffix) >= 0) return;
    return _.unPrefix(storageKey, this.keyPrefix);
}


/**
 * Gets originally stored data type for given (prefixed) `key`.
 *
 * @param  {String} pKey prefixed key of stored value
 * @return {String}
 */
function _getKeyDataType(pKey) {
    pKey = _dataTypeKey.call(this, pKey);
    return this._storage.getItem(pKey);
}


/**
 * Stores data type for given (prefixed) `key` and `value`.
 * Returns data type for `value`.
 * 
 * @param {String} pKey prefixed key of stored value
 * @param {Any} value
 * @return {String}
 */
function _setKeyDataType(pKey, value) {
    var dataType = _getValueType(value);
    pKey = _dataTypeKey.call(this, pKey);
    this._storage.setItem(pKey, dataType);
    return dataType;
}


/**
 * Removes stored data type for given (prefixed) `key`.
 * 
 * @param  {String} pKey prefixed key of stored value
 */
function _removeKeyDataType(pKey) {
    pKey = _dataTypeKey.call(this, pKey);
    this._storage.removeItem(pKey);
}


/**
 * Returns the key to store data type for given (prefixed) `key`.
 * 
 * @param  {String} pKey prefixed key of stored value
 * @return {String}
 */
function _dataTypeKey(pKey) {
    return pKey + this._typeSuffix;
}


/**
 * Returns type of value as string. Class name returned for objects ('null' for null).
 * @param  {Any} value
 * @return {String}
 */
function _getValueType(value) {
    var valueType = typeof value
        , className = value && value.constructor.name
        , dataType = valuesDataTypes[className];
    return dataType || (
            valueType != 'object'
                ? valueType
                : value == null
                    ? 'null'
                    : value.constructor.name);
}
var valuesDataTypes = {
    // can be registered with `registerDataType`
}


/**
 * Serializes value to be stored in DOM storage.
 * 
 * @param  {Any} value value to be serialized
 * @param  {String} valueType optional data type to define serializer, _getValueType is used if not passed.
 * @return {String}
 */
function _serializeData(value, valueType) {
    valueType = valueType || _getValueType(value);
    var serializer = dataSerializers[valueType];
    return serializer
            ? serializer(value, valueType)
            : value && value.toString == Object.prototype.toString
                ? JSON.stringify(value)
                : '' + value;
}
var dataSerializers = {
    'Array': JSON.stringify
}


/**
 * Parses string retrieved from DOM storage.
 * 
 * @param  {String} valueStr
 * @param  {String} valueType data type that defines parser. Original sring will be returned if parser is not defined.
 * @return {Any}
 */
function _parseData(valueStr, valueType) {
    var parser = dataParsers[valueType];
    return parser
            ? parser(valueStr, valueType)
            : valueStr;
}
var dataParsers = {
    Object: jsonParse,
    Array: jsonParse,
    Date: function(valStr) { return new Date(valStr); },
    boolean: function(valStr) { return valStr == 'true'; },
    number: function(valStr) { return Number(valStr); },
    function: function(valStr) { return _.toFunction(valStr); },
    RegExp: function(valStr) { return _.toRegExp(valStr); }
};


/**
 * Registers data type to be saved in DOM storage. Class name can be used or result of `typeof` operator for non-objects to override default conversions.
 * 
 * @param {String} valueType class (constructor) name or the string returned by typeof.
 * @param {Function} serializer optional serializer for this type
 * @param {Function} parser optional parser for this type
 * @param {[String]} storeAsDataType optional name of stored data type if different from valueType
 */
function DOMStorage$$registerDataType(valueType, serializer, parser, storeAsDataType) {
    if (serializer) dataSerializers[valueType] = serializer;
    if (parser) dataParsers[valueType] = parser;
    valuesDataTypes[valueType] = storeAsDataType || valueType;
}


function DOMStorage$createMessenger() {
    var storageMessageSource = new StorageMessageSource(this, ['trigger']);
    var messenger = new Messenger(this, Messenger.defaultMethods, storageMessageSource);
    _.defineProperty(this, '_messenger', messenger, _.WRIT);
}

},{"../../config":64,"../../messenger":69,"../check":88,"../error":94,"../json_parse":97,"./msg_src":104,"mol-proto":109}],104:[function(require,module,exports){
'use strict';


var MessageSource = require('../../messenger/m_source')
    , _ = require('mol-proto')
    , config = require('../../config')
    , miloCount = require('../../util/count')
    , StorageMessageSourceError = require('../../util/error').StorageMessageSource;

var StorageMessageSource = _.createSubclass(MessageSource, 'StorageMessageSource', true);


_.extendProto(StorageMessageSource, {
    // implementing MessageSource interface
    init: init,
    addSourceSubscriber: StorageMessageSource$addSourceSubscriber,
    removeSourceSubscriber: StorageMessageSource$removeSourceSubscriber,
    postMessage: StorageMessageSource$postMessage,
    trigger: StorageMessageSource$trigger,

    //class specific methods
    handleEvent: handleEvent  // event dispatcher - as defined by Event DOM API
});

module.exports = StorageMessageSource;


function init(hostObject, proxyMethods, messengerAPIOrClass) {
    if (hostObject.constructor.name != 'DOMStorage')
        throw new StorageMessageSourceError('hostObject should be an instance of DOMStorage');
    this.storage = hostObject;
    this.messageKey = config.domStorage.messageKey;
    this.window = hostObject.window;
    MessageSource.prototype.init.apply(this, arguments);
}


function StorageMessageSource$addSourceSubscriber(sourceMessage) {
    this.window.addEventListener('storage', this, false);
}


function StorageMessageSource$removeSourceSubscriber(sourceMessage) {
    this.window.removeEventListener('storage', this, false);
}


function StorageMessageSource$postMessage(message, data) {
    this.messenger.postMessageSync(message, data);
}


function StorageMessageSource$trigger(msgType, data) {
    var key = this.messageKey + msgType;
    data = data || {};
    data[config.domStorage.messageTimestamp] = miloCount();
    _.deferMethod(this.storage, 'setItem', key, data);
}


function handleEvent(event) {
    if (event.storageArea != this.storage._storage) return;
    var key = this.storage._domStorageKey(event.key); if (! key) return;
    var msgType = _.unPrefix(key, this.messageKey); if (! msgType) return;
    var data = this.storage.getItem(key); if (! data) return;
    this.dispatchMessage(msgType, data);
}

},{"../../config":64,"../../messenger/m_source":72,"../../util/count":90,"../../util/error":94,"mol-proto":109}],105:[function(require,module,exports){
;(function(){

// This would be the place to edit if you want a different
// Base32 implementation

var alphabet = '0123456789abcdefghjkmnpqrtuvwxyz'
var alias = { o:0, i:1, l:1, s:5 }

/**
 * Build a lookup table and memoize it
 *
 * Return an object that maps a character to its
 * byte value.
 */

var lookup = function() {
    var table = {}
    // Invert 'alphabet'
    for (var i = 0; i < alphabet.length; i++) {
        table[alphabet[i]] = i
    }
    // Splice in 'alias'
    for (var key in alias) {
        if (!alias.hasOwnProperty(key)) continue
        table[key] = table['' + alias[key]]
    }
    lookup = function() { return table }
    return table
}

/**
 * A streaming encoder
 *
 *     var encoder = new base32.Encoder()
 *     var output1 = encoder.update(input1)
 *     var output2 = encoder.update(input2)
 *     var lastoutput = encode.update(lastinput, true)
 */

function Encoder() {
    var skip = 0 // how many bits we will skip from the first byte
    var bits = 0 // 5 high bits, carry from one byte to the next

    this.output = ''

    // Read one byte of input
    // Should not really be used except by "update"
    this.readByte = function(byte) {
        // coerce the byte to an int
        if (typeof byte == 'string') byte = byte.charCodeAt(0)

        if (skip < 0) { // we have a carry from the previous byte
            bits |= (byte >> (-skip))
        } else { // no carry
            bits = (byte << skip) & 248
        }

        if (skip > 3) {
            // not enough data to produce a character, get us another one
            skip -= 8
            return 1
        }

        if (skip < 4) {
            // produce a character
            this.output += alphabet[bits >> 3]
            skip += 5
        }

        return 0
    }

    // Flush any remaining bits left in the stream
    this.finish = function(check) {
        var output = this.output + (skip < 0 ? alphabet[bits >> 3] : '') + (check ? '$' : '')
        this.output = ''
        return output
    }
}

/**
 * Process additional input
 *
 * input: string of bytes to convert
 * flush: boolean, should we flush any trailing bits left
 *        in the stream
 * returns: a string of characters representing 'input' in base32
 */

Encoder.prototype.update = function(input, flush) {
    for (var i = 0; i < input.length; ) {
        i += this.readByte(input[i])
    }
    // consume all output
    var output = this.output
    this.output = ''
    if (flush) {
      output += this.finish()
    }
    return output
}

// Functions analogously to Encoder

function Decoder() {
    var skip = 0 // how many bits we have from the previous character
    var byte = 0 // current byte we're producing

    this.output = ''

    // Consume a character from the stream, store
    // the output in this.output. As before, better
    // to use update().
    this.readChar = function(char) {
        if (typeof char != 'string'){
            if (typeof char == 'number') {
                char = String.fromCharCode(char)
            }
        }
        char = char.toLowerCase()
        var val = lookup()[char]
        if (typeof val == 'undefined') {
            // character does not exist in our lookup table
            return // skip silently. An alternative would be:
            // throw Error('Could not find character "' + char + '" in lookup table.')
        }
        val <<= 3 // move to the high bits
        byte |= val >>> skip
        skip += 5
        if (skip >= 8) {
            // we have enough to preduce output
            this.output += String.fromCharCode(byte)
            skip -= 8
            if (skip > 0) byte = (val << (5 - skip)) & 255
            else byte = 0
        }

    }

    this.finish = function(check) {
        var output = this.output + (skip < 0 ? alphabet[bits >> 3] : '') + (check ? '$' : '')
        this.output = ''
        return output
    }
}

Decoder.prototype.update = function(input, flush) {
    for (var i = 0; i < input.length; i++) {
        this.readChar(input[i])
    }
    var output = this.output
    this.output = ''
    if (flush) {
      output += this.finish()
    }
    return output
}

/** Convenience functions
 *
 * These are the ones to use if you just have a string and
 * want to convert it without dealing with streams and whatnot.
 */

// String of data goes in, Base32-encoded string comes out.
function encode(input) {
  var encoder = new Encoder()
  var output = encoder.update(input, true)
  return output
}

// Base32-encoded string goes in, decoded data comes out.
function decode(input) {
    var decoder = new Decoder()
    var output = decoder.update(input, true)
    return output
}

var base32 = {
    Decoder: Decoder,
    Encoder: Encoder,
    encode: encode,
    decode: decode
}

if (typeof window !== 'undefined') {
  // we're in a browser - OMG!
  window.base32 = base32
}

if (typeof module !== 'undefined' && module.exports) {
  // nodejs/browserify
  module.exports = base32
}
})();

},{}],106:[function(require,module,exports){
// doT.js
// 2011, Laura Doktorova, https://github.com/olado/doT
// Licensed under the MIT license.

(function() {
	"use strict";

	var doT = {
		version: '1.0.1',
		templateSettings: {
			evaluate:    /\{\{([\s\S]+?(\}?)+)\}\}/g,
			interpolate: /\{\{=([\s\S]+?)\}\}/g,
			encode:      /\{\{!([\s\S]+?)\}\}/g,
			use:         /\{\{#([\s\S]+?)\}\}/g,
			useParams:   /(^|[^\w$])def(?:\.|\[[\'\"])([\w$\.]+)(?:[\'\"]\])?\s*\:\s*([\w$\.]+|\"[^\"]+\"|\'[^\']+\'|\{[^\}]+\})/g,
			define:      /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
			defineParams:/^\s*([\w$]+):([\s\S]+)/,
			conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
			iterate:     /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
			varname:	'it',
			strip:		true,
			append:		true,
			selfcontained: false
		},
		template: undefined, //fn, compile template
		compile:  undefined  //fn, for express
	};

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = doT;
	} else if (typeof define === 'function' && define.amd) {
		define(function(){return doT;});
	} else {
		(function(){ return this || (0,eval)('this'); }()).doT = doT;
	}

	function encodeHTMLSource() {
		var encodeHTMLRules = { "&": "&#38;", "<": "&#60;", ">": "&#62;", '"': '&#34;', "'": '&#39;', "/": '&#47;' },
			matchHTML = /&(?!#?\w+;)|<|>|"|'|\//g;
		return function() {
			return this ? this.replace(matchHTML, function(m) {return encodeHTMLRules[m] || m;}) : this;
		};
	}
	String.prototype.encodeHTML = encodeHTMLSource();

	var startend = {
		append: { start: "'+(",      end: ")+'",      endencode: "||'').toString().encodeHTML()+'" },
		split:  { start: "';out+=(", end: ");out+='", endencode: "||'').toString().encodeHTML();out+='"}
	}, skip = /$^/;

	function resolveDefs(c, block, def) {
		return ((typeof block === 'string') ? block : block.toString())
		.replace(c.define || skip, function(m, code, assign, value) {
			if (code.indexOf('def.') === 0) {
				code = code.substring(4);
			}
			if (!(code in def)) {
				if (assign === ':') {
					if (c.defineParams) value.replace(c.defineParams, function(m, param, v) {
						def[code] = {arg: param, text: v};
					});
					if (!(code in def)) def[code]= value;
				} else {
					new Function("def", "def['"+code+"']=" + value)(def);
				}
			}
			return '';
		})
		.replace(c.use || skip, function(m, code) {
			if (c.useParams) code = code.replace(c.useParams, function(m, s, d, param) {
				if (def[d] && def[d].arg && param) {
					var rw = (d+":"+param).replace(/'|\\/g, '_');
					def.__exp = def.__exp || {};
					def.__exp[rw] = def[d].text.replace(new RegExp("(^|[^\\w$])" + def[d].arg + "([^\\w$])", "g"), "$1" + param + "$2");
					return s + "def.__exp['"+rw+"']";
				}
			});
			var v = new Function("def", "return " + code)(def);
			return v ? resolveDefs(c, v, def) : v;
		});
	}

	function unescape(code) {
		return code.replace(/\\('|\\)/g, "$1").replace(/[\r\t\n]/g, ' ');
	}

	doT.template = function(tmpl, c, def) {
		c = c || doT.templateSettings;
		var cse = c.append ? startend.append : startend.split, needhtmlencode, sid = 0, indv,
			str  = (c.use || c.define) ? resolveDefs(c, tmpl, def || {}) : tmpl;

		str = ("var out='" + (c.strip ? str.replace(/(^|\r|\n)\t* +| +\t*(\r|\n|$)/g,' ')
					.replace(/\r|\n|\t|\/\*[\s\S]*?\*\//g,''): str)
			.replace(/'|\\/g, '\\$&')
			.replace(c.interpolate || skip, function(m, code) {
				return cse.start + unescape(code) + cse.end;
			})
			.replace(c.encode || skip, function(m, code) {
				needhtmlencode = true;
				return cse.start + unescape(code) + cse.endencode;
			})
			.replace(c.conditional || skip, function(m, elsecase, code) {
				return elsecase ?
					(code ? "';}else if(" + unescape(code) + "){out+='" : "';}else{out+='") :
					(code ? "';if(" + unescape(code) + "){out+='" : "';}out+='");
			})
			.replace(c.iterate || skip, function(m, iterate, vname, iname) {
				if (!iterate) return "';} } out+='";
				sid+=1; indv=iname || "i"+sid; iterate=unescape(iterate);
				return "';var arr"+sid+"="+iterate+";if(arr"+sid+"){var "+vname+","+indv+"=-1,l"+sid+"=arr"+sid+".length-1;while("+indv+"<l"+sid+"){"
					+vname+"=arr"+sid+"["+indv+"+=1];out+='";
			})
			.replace(c.evaluate || skip, function(m, code) {
				return "';" + unescape(code) + "out+='";
			})
			+ "';return out;")
			.replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\r/g, '\\r')
			.replace(/(\s|;|\}|^|\{)out\+='';/g, '$1').replace(/\+''/g, '')
			.replace(/(\s|;|\}|^|\{)out\+=''\+/g,'$1out+=');

		if (needhtmlencode && c.selfcontained) {
			str = "String.prototype.encodeHTML=(" + encodeHTMLSource.toString() + "());" + str;
		}
		try {
			return new Function(c.varname, str);
		} catch (e) {
			if (typeof console !== 'undefined') console.log("Could not create a template function: " + str);
			throw e;
		}
	};

	doT.compile = function(tmpl, def) {
		return doT.template(tmpl, null, def);
	};
}());

},{}],107:[function(require,module,exports){
/* doT + auto-compilation of doT templates
 *
 * 2012, Laura Doktorova, https://github.com/olado/doT
 * Licensed under the MIT license
 *
 * Compiles .def, .dot, .jst files found under the specified path.
 * It ignores sub-directories.
 * Template files can have multiple extensions at the same time.
 * Files with .def extension can be included in other files via {{#def.name}}
 * Files with .dot extension are compiled into functions with the same name and
 * can be accessed as renderer.filename
 * Files with .jst extension are compiled into .js files. Produced .js file can be
 * loaded as a commonJS, AMD module, or just installed into a global variable
 * (default is set to window.render).
 * All inline defines defined in the .jst file are
 * compiled into separate functions and are available via _render.filename.definename
 *
 * Basic usage:
 * var dots = require("dot").process({path: "./views"});
 * dots.mytemplate({foo:"hello world"});
 *
 * The above snippet will:
 * 1. Compile all templates in views folder (.dot, .def, .jst)
 * 2. Place .js files compiled from .jst templates into the same folder.
 *    These files can be used with require, i.e. require("./views/mytemplate").
 * 3. Return an object with functions compiled from .dot templates as its properties.
 * 4. Render mytemplate template.
 */

var fs = require("fs"),
	doT = module.exports = require("./doT");

doT.process = function(options) {
	//path, destination, global, rendermodule, templateSettings
	return new InstallDots(options).compileAll();
};

function InstallDots(o) {
	this.__path 		= o.path || "./";
	if (this.__path[this.__path.length-1] !== '/') this.__path += '/';
	this.__destination	= o.destination || this.__path;
	if (this.__destination[this.__destination.length-1] !== '/') this.__destination += '/';
	this.__global		= o.global || "window.render";
	this.__rendermodule	= o.rendermodule || {};
	this.__settings 	= o.templateSettings ? copy(o.templateSettings, copy(doT.templateSettings)) : undefined;
	this.__includes		= {};
}

InstallDots.prototype.compileToFile = function(path, template, def) {
	def = def || {};
	var modulename = path.substring(path.lastIndexOf("/")+1, path.lastIndexOf("."))
		, defs = copy(this.__includes, copy(def))
		, settings = this.__settings || doT.templateSettings
		, compileoptions = copy(settings)
		, defaultcompiled = doT.template(template, settings, defs)
		, exports = []
		, compiled = ""
		, fn;

	for (var property in defs) {
		if (defs[property] !== def[property] && defs[property] !== this.__includes[property]) {
			fn = undefined;
			if (typeof defs[property] === 'string') {
				fn = doT.template(defs[property], settings, defs);
			} else if (typeof defs[property] === 'function') {
				fn = defs[property];
			} else if (defs[property].arg) {
				compileoptions.varname = defs[property].arg;
				fn = doT.template(defs[property].text, compileoptions, defs);
			}
			if (fn) {
				compiled += fn.toString().replace('anonymous', property);
				exports.push(property);
			}
		}
	}
	compiled += defaultcompiled.toString().replace('anonymous', modulename);
	fs.writeFileSync(path, "(function(){" + compiled
		+ "var itself=" + modulename + ";"
		+ addexports(exports)
		+ "if(typeof module!=='undefined' && module.exports) module.exports=itself;else if(typeof define==='function')define(function(){return itself;});else {"
		+ this.__global + "=" + this.__global + "||{};" + this.__global + "['" + modulename + "']=itself;}}());");
};

function addexports(exports) {
	for (var ret ='', i=0; i< exports.length; i++) {
		ret += "itself." + exports[i]+ "=" + exports[i]+";";
	}
	return ret;
}

function copy(o, to) {
	to = to || {};
	for (var property in o) {
		to[property] = o[property];
	}
	return to;
}

function readdata(path) {
	var data = fs.readFileSync(path);
	if (data) return data.toString();
	console.log("problems with " + path);
}

InstallDots.prototype.compilePath = function(path) {
	var data = readdata(path);
	if (data) {
		return doT.template(data,
					this.__settings || doT.templateSettings,
					copy(this.__includes));
	}
};

InstallDots.prototype.compileAll = function() {
	console.log("Compiling all doT templates...");

	var defFolder = this.__path,
		sources = fs.readdirSync(defFolder),
		k, l, name;

	for( k = 0, l = sources.length; k < l; k++) {
		name = sources[k];
		if (/\.def(\.dot|\.jst)?$/.test(name)) {
			console.log("Loaded def " + name);
			this.__includes[name.substring(0, name.indexOf('.'))] = readdata(defFolder + name);
		}
	}

	for( k = 0, l = sources.length; k < l; k++) {
		name = sources[k];
		if (/\.dot(\.def|\.jst)?$/.test(name)) {
			console.log("Compiling " + name + " to function");
			this.__rendermodule[name.substring(0, name.indexOf('.'))] = this.compilePath(defFolder + name);
		}
		if (/\.jst(\.dot|\.def)?$/.test(name)) {
			console.log("Compiling " + name + " to file");
			this.compileToFile(this.__destination + name.substring(0, name.indexOf('.')) + '.js',
					readdata(defFolder + name));
		}
	}
	return this.__rendermodule;
};

},{"./doT":106,"fs":108}],108:[function(require,module,exports){

},{}],109:[function(require,module,exports){
'use strict';

var utils = require('./utils');


/**
 * [__Prototype functions__](proto_prototype.js.html)
 *
 * - [extendProto](proto_prototype.js.html#extendProto)
 * - [createSubclass](proto_prototype.js.html#createSubclass)
 * - [makeSubclass](proto_prototype.js.html#makeSubclass)
 * - [newApply](proto_prototype.js.html#newApply)
 */
var prototypeMethods = require('./proto_prototype');


/**
 * [__Object functions__](proto_object.js.html)
 *
 * - [extend](proto_object.js.html#extend)
 * - [clone](proto_object.js.html#clone)
 * - [defineProperty](proto_object.js.html#defineProperty)
 * - [defineProperties](proto_object.js.html#defineProperties)
 * - [deepExtend](proto_object.js.html#deepExtend)
 * - [deepClone](proto_object.js.html#deepClone)
 * - [keys](proto_object.js.html#keys)
 * - [allKeys](proto_object.js.html#allKeys)
 * - [values](proto_object.js.html#values)
 * - [keyOf](proto_object.js.html#keyOf)
 * - [allKeysOf](proto_object.js.html#allKeysOf)
 * - [eachKey](proto_object.js.html#eachKey)
 * - [mapKeys](proto_object.js.html#mapKeys)
 * - [reduceKeys](proto_object.js.html#reduceKeys)
 * - [filterKeys](proto_object.js.html#filterKeys)
 * - [someKey](proto_object.js.html#someKey)
 * - [everyKey](proto_object.js.html#everyKey)
 * - [findValue](proto_object.js.html#findValue)
 * - [findKey](proto_object.js.html#findKey)
 * - [pickKeys](proto_object.js.html#pickKeys)
 * - [omitKeys](proto_object.js.html#omitKeys)
 * - [isEqual](proto_object.js.html#isEqual)
 */
var objectMethods = require('./proto_object');


/**
 * [__Array functions__](proto_array.js.html)
 *
 * - [find](proto_array.js.html#find)
 * - [findIndex](proto_array.js.html#findIndex)
 * - [appendArray](proto_array.js.html#appendArray)
 * - [prependArray](proto_array.js.html#prependArray)
 * - [spliceItem](proto_array.js.html#spliceItem)
 * - [toArray](proto_array.js.html#toArray)
 * - [object](proto_array.js.html#object)
 * - [mapToObject](proto_array.js.html#mapToObject)
 * - [unique](proto_array.js.html#unique)
 * - [deepForEach](proto_array.js.html#deepForEach)
 *
 * Functions that Array [implements natively](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/prototype#Methods) are also added - they can be used with array-like objects and for chaining (native functions are always called).
 */
var arrayMethods = require('./proto_array');


/**
 * [__Function functions__](proto_function.js.html)
 *
 * - [makeFunction](proto_function.js.html#makeFunction)
 * - [partial](proto_function.js.html#partial)
 * - [partialRight](proto_function.js.html#partialRight)
 * - [memoize](proto_function.js.html#memoize)
 * - [delay](proto_function.js.html#delay)
 * - [defer](proto_function.js.html#defer)
 * - [delayed](proto_function.js.html#delayed)
 * - [deferred](proto_function.js.html#deferred)
 * - [deferTicks](proto_function.js.html#deferTicks)
 * - [delayMethod](proto_function.js.html#delayMethod)
 * - [deferMethod](proto_function.js.html#deferMethod)
 * - [debounce](proto_function.js.html#debounce)
 * - [throttle](proto_function.js.html#throttle) 
 * - [once](proto_function.js.html#once)
 * - [waitFor](proto_function.js.html#waitFor)
*/
var functionMethods = require('./proto_function');


/**
 * [__String functions__](proto_string.js.html)
 *
 * - [firstUpperCase](proto_string.js.html#firstUpperCase)
 * - [firstLowerCase](proto_string.js.html#firstLowerCase)
 * - [toRegExp](proto_string.js.html#toRegExp)
 * - [toFunction](proto_string.js.html#toFunction)
 * - [toDate](proto_string.js.html#toDate)
 * - [toQueryString](proto_string.js.html#toQueryString)
 * - [fromQueryString](proto_string.js.html#fromQueryString)
 * - [jsonParse](proto_string.js.html#jsonParse)
 * - [hashCode](proto_string.js.html#hashCode)
 * - [unPrefix](proto_string.js.html#unPrefix)
 */
var stringMethods = require('./proto_string');


/**
 * [__Number functions__](proto_number.js.html)
 * 
 * - [isNumeric](proto_number.js.html#isNumeric)
 */
var numberMethods = require('./proto_number');


/**
 * [__Utility functions__](proto_util.js.html)
 * 
 * - [times](proto_util.js.html#times)
 * - [repeat](proto_util.js.html#repeat)
 * - [tap](proto_util.js.html#tap)
 * - [result](proto_util.js.html#result)
 * - [identity](proto_util.js.html#identity)
 */
var utilMethods = require('./proto_util');


/**
 * Chaining
 * ========
 *
 * `_` can be used to create a wrapped value (object, function, array, etc.) to allow chaining of Proto functions.
 * To unwrap, `_` method of a wrapped value should be used.
 * Usage:
 * ```
 * var arr = _({ 0: 3, 1: 4, 2: 5, length: 3})
 *              .toArray()
 *              .prependArray([1, 2])
 *              .appendArray([6, 7, 8])
 *              ._();
 * ```
 * A wrapped object is an instance of `_` (`Proto` class).
 *
 * Chaining is implemented for development convenience, but it has performance overhead, not only to wrap and unwrap values but in each function call.
 * Although all Proto functions are implemented as methods operating on this and the overhead to redefine them as functions is very small, the overhead to redefine them as methods of wrapped value is slightly higher - chaining is 15-25% slower than using functions (properties of _ that take the first parameter).
 * In cases when performance is critical, you may want to avoid using chaining.
 *
 * @param {Any} self A value to be wrapped
 * @return {Proto}
 */
function Proto(self) {
    // wrap passed parameter in _ object
    var wrapped = Object.create(Proto.prototype);
    wrapped.self = self;
    return wrapped;
};

var _ = Proto;


// store raw methods from different modules in __ object (double "_")
var __ = {};

objectMethods.extend.call(__, objectMethods);
__.extend.call(__, prototypeMethods);
__.extend.call(__, arrayMethods);
__.extend.call(__, stringMethods);
__.extend.call(__, numberMethods);
__.extend.call(__, functionMethods);
__.extend.call(__, utilMethods);


// add __ as property of Proto, so they can be used as mixins in other classes
__.defineProperty(Proto, '__', __);


// add _ method to unwrap wrapped value (Proto instance)
function unwrapProto() { return this.self; }
__.extendProto.call(Proto, { _: unwrapProto });

// add constants (functions will be overwritten)
__.extend.call(Proto, objectMethods._constants);

// add functions that take first parameter instead of "this" to Proto
var protoFuncs = __.mapKeys.call(__, utils.makeProtoFunction, true);
__.extend.call(Proto, protoFuncs);

// add Proto wrapped value instance methods to Proto prototype
var protoInstanceMethods = __.mapKeys.call(__, utils.makeProtoInstanceMethod, true);
__.extendProto.call(Proto, protoInstanceMethods);


/**
 * In windows environment, a global `_` value is preserved in `_.underscore`
 */
if (typeof window == 'object') {
    // preserve existing _ object
    if (window._)
        Proto.underscore = window._

    // expose global _ and Proto
    window._ = Proto;
}

if (typeof module == 'object' && module.exports)
    // export for node/browserify
    module.exports = Proto;

},{"./proto_array":110,"./proto_function":111,"./proto_number":112,"./proto_object":113,"./proto_prototype":114,"./proto_string":115,"./proto_util":116,"./utils":117}],110:[function(require,module,exports){
'use strict';

var __ = require('./proto_object')
    , utils = require('./utils');


/**
 * - [find](#find)
 * - [findIndex](#findIndex)
 * - [appendArray](#appendArray)
 * - [prependArray](#prependArray)
 * - [spliceItem](#spliceItem)
 * - [toArray](#toArray)
 * - [object](#object)
 * - [mapToObject](#mapToObject)
 * - [unique](#unique)
 * - [deepForEach](#deepForEach)
 *
 * These methods can be [chained](proto.js.html#Proto).
 */
var arrayMethods = module.exports = {
    // find: see below
    // findIndex: see below
    appendArray: appendArray,
    prependArray: prependArray,
    toArray: toArray,
    object: object,
    mapToObject: mapToObject,
    unique: unique,
    deepForEach: deepForEach,
    spliceItem: spliceItem
};


/**
 * Functions that Array [implements natively](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/prototype#Methods) are also included for convenience - they can be used with array-like objects and for chaining (native functions are always called).
 * These methods can be [chained](proto.js.html#Proto) too.
 */
var nativeArrayMethodsNames = [ 'join', 'pop', 'push', 'concat',
    'reverse', 'shift', 'unshift', 'slice', 'splice',
    'sort', 'filter', 'forEach', 'some', 'every',
    'map', 'indexOf', 'lastIndexOf', 'reduce', 'reduceRight'];

var nativeArrayMethods = mapToObject.call(nativeArrayMethodsNames,
        function(methodName) {
            return Array.prototype[methodName];
        });

__.extend.call(arrayMethods, nativeArrayMethods);


/**
 * Implementation of ES6 [Array __find__ method](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find) (native method is used if available).
 * Returns array element that passes callback test.
 *
 * @param {Array} self array to search in
 * @param {Function} callback should return `true` for item to pass the test, passed `value`, `index` and `self` as parameters
 * @param {Object} thisArg optional context (`this`) of callback call
 * @return {Any}
 */
arrayMethods.find = Array.prototype.find
    || utils.makeFindMethod(arrayMethods.forEach, 'value');


/**
 * Implementation of ES6 [Array __findIndex__ method](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex) (native method is used if available).
 * Returns the index of array element that passes callback test. Returns `-1` if not found.
 *
 * @param {Array} self array to search in
 * @param {Function} callback should return `true` for item to pass the test, passed `value`, `index` and `self` as parameters
 * @param {Object} thisArg optional context (`this`) of callback call
 * @return {Integer}
 */
arrayMethods.findIndex = Array.prototype.findIndex
    || utils.makeFindMethod(arrayMethods.forEach, 'index');


/**
 * Appends `arrayToAppend` to the end of array `self` in place (can be an instance of Array or array-like object).
 * Changes the value of `self` (it uses `Array.prototype.splice`) and returns `self`.
 *
 * @param {Array} self An array that will be modified
 * @param {Array|Array-like} arrayToAppend An array that will be appended
 * @return {Array}
 */
function appendArray(arrayToAppend) {
    if (! arrayToAppend.length) return this;
    if (! Array.isArray(arrayToAppend))
        arrayToAppend = toArray.call(arrayToAppend);
    
    var args = [this.length, 0].concat(arrayToAppend);
    arrayMethods.splice.apply(this, args);

    return this;
}


/**
 * Prepends `arrayToPrepend` to the beginnig of array `self` in place (can be an instance of Array or array-like object).
 * Changes the value of `self` (it uses `Array.prototype.splice`) and returns `self`.
 *
 * @param {Array} self An array that will be modified
 * @param {Array|Array-like} arrayToAppend An array that will be prepended
 * @return {Array}
 */
function prependArray(arrayToPrepend) {
    if (! arrayToPrepend.length) return this;
    if (! Array.isArray(arrayToPrepend))
        arrayToPrepend = toArray.call(arrayToPrepend);

    var args = [0, 0].concat(arrayToPrepend);
    arrayMethods.splice.apply(this, args);

    return this;
}


/**
 * Removes item from array that is found using indexOf (i.e. '===')
 * Modifies original array and returns the reference to it.
 * 
 * @param {Array} self An array that will be modified
 * @param  {Any} item item to be removed
 * @return {Array}
 */
function spliceItem(item) {
    var index = this.indexOf(item);
    if (index >= 0) this.splice(index, 1);
    return this;
}


/**
 * Returns new array created from array-like object (e.g., `arguments` pseudo-array).
 *
 * @param {Array-like} self Object with numeric property length
 * @return {Array}
 */
function toArray() {
    return arrayMethods.slice.call(this);
}


/**
 * Returns an object created from the array of `keys` and optional array of `values`.
 *
 * @param {Array} self Array of keys
 * @param {Array|any} values Optional array of values or the value to be assigned to each property.
 * @return {Object}
 */
function object(values) {
    var obj = {}
        , valuesIsArray = Array.isArray(values);
    arrayMethods.forEach.call(this, function(key, index) {
        obj[key] = valuesIsArray ? values[index] : values;
    });

    return obj;
}


/**
 * Maps array to object.
 * Array elements become keys, value are taken from `callback`.
 * 
 * @param {Array} self An array which values will become keys of the result
 * @param {Function} callback Callback is passed `value`, `index` and `self` and should return value that will be included in the result.
 * @param {Object} thisArg An optional context of iteration (the valueof `this`), will be undefined if this parameter is not passed.
 * @return {Object}
 */
function mapToObject(callback, thisArg) {
    var result = {};
    Array.prototype.forEach.call(this, function(value, index) {
        result[value] = callback.call(thisArg, value, index, this);
    }, this);
    return result;
}


/**
 * Returns array without duplicates. Does not modify original array.
 *
 * @param {Array} self original array
 * @param {Function} callback comparison function, should return true for equal items, "===" is used if not passed.
 * @return {Array}
 */
function unique(callback) {
    var filtered = [];
    if (! callback)
        itemIndex = itemIndexOf;

    this.forEach(function(item) {
        var index = itemIndex(item);
        if (index == -1)
            filtered.push(item);
    });

    return filtered;


    function itemIndex(item) {
        return arrayMethods.findIndex.call(filtered, function(it) {
            return callback(item, it);
        });
    }

    function itemIndexOf(item) {
        return filtered.indexOf(item);
    }
}


/**
 * Iterates array and elements that are arrays calling callback with each element that is not an array. Can be used to iterate over arguments list to avoid checking whether array or list of parameters is passed.
 *
 * @param {Array|Array-like} self array of elements and arraysto iterate.
 * @param {Function} callback called for each item that is not an array. Callback is passed item, index and original array as parameters.
 * @param {Any} thisArg optional callback envocation context
 */
function deepForEach(callback, thisArg) {
    var index = 0, arr = this;
    _deepForEach.call(this);

    function _deepForEach() {
        arrayMethods.forEach.call(this, function(value) {
            if (Array.isArray(value))
                _deepForEach.call(value);
            else
                callback.call(thisArg, value, index++, arr);
        });
    }
}

},{"./proto_object":113,"./utils":117}],111:[function(require,module,exports){
'use strict';


var makeProtoFunction = require('./utils').makeProtoFunction
    , repeat = require('./proto_util').repeat;


/**
 * - [makeFunction](#makeFunction)
 * - [partial](#partial)
 * - [partialRight](#partialRight)
 * - [memoize](#memoize)
 * - [delay](#delay)
 * - [defer](#defer)
 * - [delayed](#delayed)
 * - [deferred](#deferred)
 * - [deferTicks](#deferTicks)
 * - [delayMethod](#delayMethod)
 * - [deferMethod](#deferMethod)
 * - [debounce](#debounce)
 * - [throttle](#throttle)
 * - [once](#once)
 * - [waitFor](#waitFor)
 *
 * These methods can be [chained](proto.js.html#Proto)
 */
var functionMethods = module.exports = {
    makeFunction: makeFunction,
    partial: partial,
    partialRight: partialRight,
    memoize: memoize,
    delay: delay,
    defer: defer,
    delayed: delayed,
    deferred: deferred,
    deferTicks: deferTicks,
    delayMethod: delayMethod,
    deferMethod: deferMethod,
    debounce: debounce,
    throttle: throttle,
    once: once,
    waitFor: waitFor
};


var slice = Array.prototype.slice;


/**
 * Similarly to Function constructor creates a function from code.
 * Unlike Function constructor, the first argument is a function name
 *
 * @param {String} name new function name
 * @param {String} arg1, arg2, ... the names of function parameters
 * @param {String} funcBody function body
 * @return {Function}
 */
function makeFunction(arg1, arg2, funcBody) {
    var name = this
        , count = arguments.length - 1
        , funcBody = arguments[count]
        , func
        , code = '';
    for (var i = 0; i < count; i++)
        code += ', ' + arguments[i];
    code = ['func = function ', name, '(', code.slice(2), ') {\n'
                , funcBody, '\n}'].join('');
    eval(code);
    return func;
}


/**
 * Creates a function as a result of partial function application with the passed parameters.
 *
 * @param {Function} self Function to be applied
 * @param {List} arguments Arguments after self will be prepended to the original function call when the partial function is called.
 * @return {Function}
 */
function partial() { // , ... arguments
    var func = this;
    var args = slice.call(arguments);
    return function() {
        return func.apply(this, args.concat(slice.call(arguments)));
    };
}


/**
 * Creates a function as a result of partial function application with the passed parameters, but parameters are appended on the right.
 *
 * @param {Function} self Function to be applied
 * @param {List} arguments Arguments after self will be appended on the right to the original function call when the partial function is called.
 * @return {Function}
 */
function partialRight() { // , ... arguments
    var func = this;
    var args = slice.call(arguments);
    return function() {
        return func.apply(this, slice.call(arguments).concat(args));
    };
}


/**
 * Creates a memoized version of the function using supplied hash function as key. If the hash is not supplied, uses its first parameter as the hash.
 * 
 * @param {Function} self function to be memoized
 * @param {Function} hashFunc optional hash function that is passed all function arguments and should return cache key.
 * @param {Integer} limit optional maximum number of results to be stored in the cache. 1000 by default.
 * @return {Function} memoized function
 */
function memoize(hashFunc, limit) {
    var func = this;
    var cache = {}, keysList = [];
    limit = limit || 1000;

    return function() {
        var key = hashFunc ? hashFunc.apply(this, arguments) : arguments[0];
        if (cache.hasOwnProperty(key))
            return cache[key];

        var result = cache[key] = func.apply(this, arguments);
        keysList.push(key);

        if (keysList.length > limit)
            delete cache[keysList.shift()];

        return result;
    };
}


/**
 * Delays function execution by a given time in milliseconds.
 * The context in function when it is executed is set to `null`.
 *
 * @param {Function} self function that execution has to be delayed
 * @param {Number} wait approximate dalay time in milliseconds
 * @param {List} arguments optional arguments that will be passed to the function
 */
function delay(wait) { // , arguments
    var args = slice.call(arguments, 1);
    return _delay(this, wait, args);
}
 

/**
 * Defers function execution (executes as soon as execution loop becomes free)
 * The context in function when it is executed is set to `null`.
 *
 * @param {Function} self function that execution has to be delayed
 * @param {List} arguments optional arguments that will be passed to the function
 */
function defer() { // , arguments
    return _delay(this, 1, arguments);
}

function _delay(func, wait, args, context) {
    return setTimeout(func.apply.bind(func, context || null, args), wait);
}

/**
 * Same as _.defer, takes first argument as the function to be deferred
 */
var deferFunc = makeProtoFunction(defer);

/**
 * Defers function execution for `times` ticks (executes after execution loop becomes free `times` times)
 * The context in function when it is executed is set to `null`.
 *
 * @param {Function} self function that execution has to be delayed
 * @param {Integer} ticks number of times to defer execution
 * @param {List} arguments optional arguments that will be passed to the function
 */
function deferTicks(ticks) { // , arguments
    if (ticks < 2) return defer.apply(this, arguments);
    var args = repeat.call(deferFunc, ticks - 1);
    args = args.concat(this, slice.call(arguments, 1)); 
    deferFunc.apply(null, args);
}


/**
 * Works like _.delay but allows to defer method call of `self` which will be the first _.delayMethod parameter
 *
 * @param {Object} self object to delay method call of
 * @param {Function|String} funcOrMethodName function or name of method
 * @param {Number} wait approximate dalay time in milliseconds
 * @param {List} arguments arguments to pass to method
 */
function delayMethod(funcOrMethodName, wait) { // , ... arguments
    var args = slice.call(arguments, 2);
    _delayMethod(this, funcOrMethodName, wait, args);
}


/**
 * Works like _.defer but allows to defer method call of `self` which will be the first _.deferMethod parameter
 *
 * @param {Object} self object to defer method call of
 * @param {Function|String} funcOrMethodName function or name of method
 * @param {List} arguments arguments to pass to method
 */
function deferMethod(funcOrMethodName) { // , ... arguments
    var args = slice.call(arguments, 1);
    _delayMethod(this, funcOrMethodName, 1, args);
}

function _delayMethod(object, funcOrMethodName, wait, args) {
    return setTimeout(function() {
        var func = typeof funcOrMethodName == 'string'
                    ? object[funcOrMethodName]
                    : funcOrMethodName;
        func.apply(object, args);
    }, wait);
}


/**
 * Returns function that will execute the original function `wait` ms after it has been called
 * The context in function when it is executed is set to `null`.
 *
 * @param {Function} self function which execution has to be deferred
 * @param {Number} wait approximate dalay time in milliseconds
 * @param {List} arguments optional arguments that will be passed to the function
 * @return {Function}
 */
function delayed(wait) { //, ... arguments
    var func = this
        , args = slice.call(arguments, 1);
    return function() {
        return _delay(func, wait, args, this);
    };
}


/**
 * Returns function that will execute the original function on the next tick once it has been called
 * The context in function when it is executed is set to `null`.
 *
 * @param {Function} self function which execution has to be deferred
 * @param {List} arguments optional arguments that will be passed to the function
 * @return {Function}
 */
function deferred() { //, ... arguments
    var func = this
        , args = arguments;
    return function() {
        return _delay(func, 1, args, this);
    };
}


/**
 * Creates a function that will call original function once it has not been called for a specified time
 *
 * @param {Function} self function that execution has to be delayed
 * @param {Number} wait approximate dalay time in milliseconds
 * @param {Boolean} immediate true to invoke funciton immediately and then ignore following calls for wait milliseconds
 * @return {Function}
 */
function debounce(wait, immediate) {
    var func = this; // first parameter of _.debounce
    var timeout, args, context, timestamp, result;
    return function() {
        context = this; // store original context
        args = arguments;
        timestamp = Date.now();
        var callNow = immediate && ! timeout;
        if (! timeout)
            timeout = setTimeout(later, wait);
        if (callNow)
            result = func.apply(context, args);
        return result;

        function later() {
            var last = Date.now() - timestamp;
            if (last < wait)
                timeout = setTimeout(later, wait - last);
            else {
                timeout = null;
                if (! immediate)
                    result = func.apply(context, args);
            }
        }
    };
}


/**
 * Returns a function, that, when invoked, will only be triggered at most once during a given window of time. 
 *
 * @param {Function} self function that execution has to be delayed
 * @param {Number} wait approximate delay time in milliseconds
 * @param {Object} options `{leading: false}` to disable the execution on the leading edge
 * @return {Function}
 */
function throttle(wait, options) {
    var func = this; // first parameter of _.throttle
    var context, args, result;
    var timeout = null;
    var previous = 0;
    options || (options = {});

    return function() {
        var now = Date.now();
        if (!previous && options.leading === false) previous = now;
        var remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0) {
            clearTimeout(timeout);
            timeout = null;
            previous = now;
            result = func.apply(context, args);
        } else if (!timeout && options.trailing !== false)
            timeout = setTimeout(later, remaining);

        return result;
    };

    function later() {
        previous = options.leading === false ? 0 : Date.now();
        timeout = null;
        result = func.apply(context, args);
    }
}


/**
 * Call passed function only once
 * @return {Function} self
 */
function once() {
    var func = this
        , ran = false
        , memo;
    return function() {
        if (ran) return memo;
        ran = true;
        memo = func.apply(this, arguments);
        func = null;
        return memo;
    };
}


/**
 * Execute a function when the condition function returns a truthy value
 * it runs the condition function every `checkInterval` milliseconds (default 50)
 *
 * @param {Function} self function: if it returns true the callback is executed
 * @param {Function} callback runs when the condition is true
 * @param {Number} maxTimeout timeout before giving up (time in milliseconds)
 * @param {Function} timedOutFunc a function called if timeout is reached
 * @param {Number} checkInterval time interval when you run the condition function (time in milliseconds), default 50 ms
 */
function waitFor(callback, maxTimeout, timedOutFunc, checkInterval){
    var start = Date.now();
    var condition = this;
    checkInterval = checkInterval || 50;
    var interval = setInterval(testCondition, checkInterval);

    function testCondition() {
        if (condition()) callback();
        else if (Date.now() - start >= maxTimeout)
            timedOutFunc && timedOutFunc();
        else return;
        clearInterval(interval);
    };
}

},{"./proto_util":116,"./utils":117}],112:[function(require,module,exports){
'use strict';

/**
 * - [isNumeric](#isNumeric)
 */
var numberMethods = module.exports = {
    isNumeric: isNumeric
};


/**
 * Function to test if a value is numeric
 *
 * @param {Any} self value to be tested
 * @return {Boolean} true if it is a numeric value
 */
function isNumeric() {
    return !isNaN(parseFloat(this)) && isFinite(this);
};

},{}],113:[function(require,module,exports){
'use strict';


var utils = require('./utils');


/**
 * - [extend](#extend)
 * - [clone](#clone)
 * - [defineProperty](#defineProperty)
 * - [defineProperties](#defineProperties)
 * - [deepExtend](#deepExtend)
 * - [deepClone](#deepClone)
 * - [keys](#keys)
 * - [allKeys](#allKeys)
 * - [values](#values)
 * - [keyOf](#keyOf)
 * - [allKeysOf](#allKeysOf)
 * - [eachKey](#eachKey)
 * - [mapKeys](#mapKeys)
 * - [reduceKeys](#reduceKeys)
 * - [filterKeys](#filterKeys)
 * - [someKey](#someKey)
 * - [everyKey](#everyKey)
 * - [findValue](#findValue)
 * - [findKey](#findKey)
 * - [pickKeys](#pickKeys)
 * - [omitKeys](#omitKeys)
 * - [isEqual](#isEqual)
 *
 * All these methods can be [chained](proto.js.html#Proto)
 */
var objectMethods = module.exports = {
    extend: extend,
    clone: clone,
    defineProperty: defineProperty,
    defineProperties: defineProperties,
    deepExtend: deepExtend,
    deepClone: deepClone,
    keys: keys,
    allKeys: allKeys,
    values: values,
    keyOf: keyOf,
    allKeysOf: allKeysOf,
    eachKey: eachKey,
    mapKeys: mapKeys,
    reduceKeys: reduceKeys,
    filterKeys: filterKeys,
    someKey: someKey,
    everyKey: everyKey,
    pickKeys: pickKeys,
    omitKeys: omitKeys,
    isEqual: isEqual
};


/**
 * ####Property descriptor constants####
 * The sum of these constants can be used as last parameter of defineProperty and defineProperties to determine types of properties.
 */
var constants = {
    ENUMERABLE: 1,
    ENUM: 1,
    CONFIGURABLE: 2,
    CONF: 2,
    WRITABLE: 4,
    WRIT: 4
};

defineProperty.call(objectMethods, '_constants', constants);


/**
 * Analogue of ES6 [Array __find__ method](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find).
 * Returns the value of object property that passes callback test.
 *
 * @param {Object} self object to search in
 * @param {Function} callback should return `true` for item to pass the test, passed `value`, `key` and `self` as parameters
 * @param {Object} thisArg optional context (`this`) of callback call
 * @param {Boolean} onlyEnumerable An optional `true` to iterate enumerable properties only.
 * @return {Any}
 */
objectMethods.findValue = utils.makeFindMethod(eachKey, 'value');


/**
 * Analogue of ES6 [Array __findIndex__ method](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex).
 * Returns the key of object property that passes callback test. Returns `undefined` if not found (unlike `findIndex`, that returns -1 in this case).
 *
 * @param {Object} self object to search in
 * @param {Function} callback should return `true` for item to pass the test, passed `value`, `key` and `self` as parameters
 * @param {Object} thisArg optional context (`this`) of callback call
 * @param {Boolean} onlyEnumerable An optional `true` to iterate enumerable properties only.
 * @return {Integer}
 */
objectMethods.findKey = utils.makeFindMethod(eachKey, 'key');


/**
 * Extends object `self` with the properties of the object `obj` copying all own properties (not those inherited via prototype chain), including non-enumerable properties (unless `onlyEnumerable` is truthy).
 * Created properties will have the same descriptors as the propertis of `obj`.
 * Returns `self` to allow chaining with other functions.
 * Can be used with functions, to copy class methods, e.g.
 *
 * @param {Object} self An object to be extended
 * @param {Object} obj An object which properties will be copied to self
 * @param {Boolean} onlyEnumerable Optional flag to prevent copying non-enumerable properties, `false` by default
 * @return {Object}
 */
function extend(obj, onlyEnumerable) {
    var descriptors = {};

    eachKey.call(obj, function(value, prop) {
        descriptors[prop] = Object.getOwnPropertyDescriptor(obj, prop);
    }, this, onlyEnumerable);

    Object.defineProperties(this, descriptors);

    return this;
}


/**
 * Makes a shallow clone of object `obj` creating an instance of the same class; the properties will have the same descriptors.
 * To clone an array use
 * ```
 * var clonedArray = [].concat(arr);
 * ```
 * This function should not be used to clone an array, because it is inefficient.
 *
 * @param {Object} self An object to be cloned
 * @return {Object}
 */
function clone() {
    if (Array.isArray(this)) return this.slice();
    if (this instanceof Date) return new Date(this);
    if (this instanceof RegExp) return new RegExp(this);
    var clonedObject = Object.create(this.constructor.prototype);
    extend.call(clonedObject, this);
    return clonedObject;
}


/**
 * Syntax sugar to shorten usage of `Object.defineProperty`.
 * The simplest usage (to add non-enumerable, non-configurable, non-writable property):
 * ```
 * _.defineProperty(obj, 'key', value);
 * ```
 *
 * To define some other properties use sum of the flags `_.ENUMERABLE` (or `_.ENUM`), `_.CONFIGURABLE` (or `_.CONF`) and `_.WRITABLE` (or `_.WRIT`):
 * ```
 * _.defineProperty(obj, 'key', value, _.ENUM + _.WRIT);
 * ```
 * Returns `self`.
 *
 * @param {Object} self An object to add a property to
 * @param {String} propertyName the name of the property that will be added
 * @param {Any} value the value of added property
 * @param {Integer} decriptorFlags bit mask of property descriptor properties composed from `_.ENUMERABLE` (or `_.ENUM`), `_.CONFIGURABLE` (or `_.CONF`) and `_.WRITABLE` (or `_.WRIT`)
 * @return {Object}
 */
function defineProperty(propertyName, value, decriptorFlags) {
    Object.defineProperty(this, propertyName,
        _getDescriptor(value, decriptorFlags));
    return this;
}


function _getDescriptor(value, decriptorFlags) {
    var descriptor = { value: value };
    if (decriptorFlags)
        extend.call(descriptor, {
            enumerable: !! (decriptorFlags & constants.ENUMERABLE),
            configurable: !! (decriptorFlags & constants.CONFIGURABLE),
            writable: !! (decriptorFlags & constants.WRITABLE)
        });

    return descriptor;
}


/**
 * Syntax sugar to shorten usage of `Object.defineProperties`.
 * The simplest usage (to add non-enumerable, non-configurable, non-writable properties):
 * ```
 * _.defineProperties(obj, {
 *     key1: value1,
 *     key2: value2 
 * });
 * ```
 * To define some other properties use sum of the flags `_.ENUMERABLE` (or `_.ENUM`), `_.CONFIGURABLE` (or `_.CONF`) and `_.WRITABLE` (or `_.WRIT`):
 * ```
 * _.defineProperties(obj, {
 *     key1: value1,
 *     key2: value2 
 * }, _.ENUM + _.WRIT);
 * ```
 * Returns `self`.
 *
 * @param {Object} self An object to add a property to
 * @param {Object} propertyValues A map of keys and values of properties thatwill be added. The descriptors of properties will be defined by the following parameters.
 * @param {Integer} decriptorFlags bit mask of property descriptor properties composed from `_.ENUMERABLE` (or `_.ENUM`), `_.CONFIGURABLE` (or `_.CONF`) and `_.WRITABLE` (or `_.WRIT`)
 * @return {Object}
 */
function defineProperties(propertyValues, decriptorFlags) {
    var descriptors = mapKeys.call(propertyValues, function(value) {
        return _getDescriptor(value, decriptorFlags);       
    }, true);
    Object.defineProperties(this, descriptors);
    return this;
}


/**
 * Extends object `self` with properties of `obj` to any depth, without overwrtiting existing object properties of `self` with object properties of `obj`.
 * Scalar properties of `obj` will overwrite properties of `self`. Scalar porperties of `self` will also be overwritten.
 * Correctly works with recursive objects.
 * Usage:
 * ```
 * var obj = {
 *     inner: {
 *         a: 1
 *     }
 * };
 *
 * _.deepExtend(obj, {
 *     inner: {
 *         b: 2
 *     }
 * });
 *
 * assert.deepEqual(obj, {
 *     inner: {
 *         a: 1,
 *         b: 2
 *     }
 * }); // assert passes
 * ```
 * Returns `self`.
 *
 * @param {Object} self An object to be extended
 * @param {Object} obj An object with properties to copy to 
 * @param {Boolean} onlyEnumerable Optional `true` to use only enumerable properties
 * @return {Object}
 */
function deepExtend(obj, onlyEnumerable) {
    return _extendTree(this, obj, onlyEnumerable, []);
}


function _extendTree(selfNode, objNode, onlyEnumerable, objTraversed) {
    if (objTraversed.indexOf(objNode) >= 0) return; // node already traversed, obj has recursion

    // store node to recognise recursion
    objTraversed.push(objNode);

    var loop = Array.isArray(objNode) ? Array.prototype.forEach : eachKey;

    loop.call(objNode, function(value, prop) {
        var descriptor = Object.getOwnPropertyDescriptor(objNode, prop);
        if (typeof value == 'object' && value != null
                && ! (value instanceof RegExp) && ! (value instanceof Date)) {
            if (! (selfNode.hasOwnProperty(prop)
                    && typeof selfNode[prop] == 'object' && selfNode[prop] != null))
                selfNode[prop] = (Array.isArray(value)) ? [] : {};
            _extendTree(selfNode[prop], value, onlyEnumerable, objTraversed);
        } else
            Object.defineProperty(selfNode, prop, descriptor);
    }, this, onlyEnumerable);

    return selfNode;
}


/**
 * Clones all object tree. Class of original object is not preserved. Returns `self`
 *
 * @param {Object} self An object to be extended
 * @param {Boolean} onlyEnumerable Optional `true` to use only enumerable properties
 * @return {Object}
 */
function deepClone(onlyEnumerable) {
    if (this instanceof Date) return new Date(this);
    if (this instanceof RegExp) return new RegExp(this);
    var clonedObject = Array.isArray(this) ? [] : {};
    deepExtend.call(clonedObject, this, onlyEnumerable);
    return clonedObject;
}


/**
 * Returns array of enumerable properties of the object
 *
 * @param {Object} self object to return keys of
 * @return {Array}
 */
function keys() {
    return Object.keys(this);
}


/**
 * Returns array of values of the object's keys
 *
 * @param {Object} self object to return values from
 * @return {Array}
 */
function values(onlyEnumerable) {
    var properties = onlyEnumerable
                ? Object.keys(this)
                : allKeys.call(this);

    return properties.map(function(prop) {
        return this[prop];
    }, this);
}


/**
 * Returns array of all property names of an object `self` (including non-enumerbale).
 * To get only enumerable properties, use `Object.keys()`.
 *
 * @param {Object} self An object to get all properties of.
 * @return {Array}
 */
 function allKeys() {
    return Object.getOwnPropertyNames(this);
 }


/**
 * An analogue of `indexOf` method of Array prototype.
 * Returns the `key` of `searchElement` in the object `self`. 
 * As object keys are unsorted, if there are several keys that hold `searchElement` any of them can be returned. Use `allKeysOf` to return all keys.
 * All own properties are searched (not those inherited via prototype chain), including non-enumerable properties (unless `onlyEnumerable` is truthy).
 *
 * @param {Object} self An object to search a value in
 * @param {Any} searchElement An element that will be searched. An exact equality is tested, so `0` is not the same as `'0'`.
 * @param {Boolean} onlyEnumerable An optional true to search among enumerable properties only.
 * @return {String} 
 */
function keyOf(searchElement, onlyEnumerable) {
    var properties = onlyEnumerable 
                        ? Object.keys(this)
                        : allKeys.call(this);

    for (var i = 0; i < properties.length; i++)
        if (searchElement === this[properties[i]])
            return properties[i];
    
    return undefined;
}


/**
 * Works similarly to the previous function, but returns the array of keys holding `searchElement` as their value.
 *
 * @param {Object} self An object to search a value in
 * @param {Any} searchElement An element that will be searched. An exact equality is tested, so `0` is not the same as `'0'`.
 * @param {Boolean} onlyEnumerable An optional true to search among enumerable properties only.
 * @return {Array[String]} 
 */
function allKeysOf(searchElement, onlyEnumerable) {
    var properties = onlyEnumerable 
                        ? Object.keys(this)
                        : allKeys.call(this);

    var keys = properties.filter(function(prop) {
        return searchElement === this[prop];
    }, this);

    return keys;
}


/**
 * An analogue of [forEach](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach) method of Array prototype.
 * Iterates all own properties of `self` (or only enumerable own properties if `onlyEnumerable` is truthy) calling callback for each key.
 * This method should not be used with arrays, it will include `length` property in iteration.
 * To iterate array-like objects (e.g., `arguments` pseudo-array) use:
 * ```
 * _.forEach(arguments, callback, thisArg);
 * ```
 * Function returns `self` to allow [chaining](proto.js.html)
 *
 * @param {Object} self An object which properties will be iterated
 * @param {Function} callback Callback is passed `value`, `key` and `self`, its return value is not used.
 * @param {Object} thisArg An optional context of iteration (the valueof `this`), will be undefined if this parameter is not passed.
 * @param {Boolean} onlyEnumerable An optional `true` to iterate enumerable properties only.
 */
function eachKey(callback, thisArg, onlyEnumerable) {
    var properties = onlyEnumerable 
                        ? Object.keys(this)
                        : allKeys.call(this);

    properties.forEach(function(prop) {
        callback.call(thisArg, this[prop], prop, this);
    }, this);

    return this;
}


/**
 * An analogue of [map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map) method of Array prototype.
 * Returns the object that is the result of the application of callback to values in all own properties of `self` (or only enumerable own properties if `onlyEnumerable` is truthy).
 * The returned object will be the instance of the same class as `self`.
 * Property descriptors of the returned object will have the same `enumerable`, `configurable` and `writable` settings as the properties of `self`.
 * This method should not be used with arrays, it will include `length` property in iteration.
 * To map array-like objects use:
 * ```
 * var result = _.map(arguments, callback, thisArg);
 * ```
 * 
 * @param {Object} self An object which properties will be iterated
 * @param {Function} callback Callback is passed `value`, `key` and `self` and should return value that will be included in the map.
 * @param {Object} thisArg An optional context of iteration (the valueof `this`), will be undefined if this parameter is not passed.
 * @param {Boolean} onlyEnumerable An optional `true` to iterate enumerable properties only.
 * @return {Object}
 */
function mapKeys(callback, thisArg, onlyEnumerable) {
    var descriptors = {};
    eachKey.call(this, mapProperty, thisArg, onlyEnumerable);
    return Object.create(this.constructor.prototype, descriptors);

    function mapProperty(value, key, self) {
        descriptors[key] = Object.getOwnPropertyDescriptor(self, key);
        descriptors[key].value = callback.call(this, value, key, self);
    }
}


/**
 * An analogue of [reduce](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Reduce) method of Array prototype.
 * This method reduces the object to a single value. Iteration order is impossible to control with object.
 * This method should not be used with arrays, it will include `length` property in iteration.
 * To reduce array-like objects use:
 * ```
 * var result = _.reduce(arguments, callback, initialValue, thisArg);
 * ```
 * 
 * @param {Object} self An object which properties will be iterated
 * @param {Function} callback Callback is passed `previousValue`, `value`, `key` and `self` and should return value that will be used as the `previousValue` for the next `callback` call.
 * @param {Any} initialValue The initial value passed to callback as the first parameter on the first call.
 * @param {Object} thisArg An optional context of iteration (the valueof `this`), will be undefined if this parameter is not passed.
 * @param {Boolean} onlyEnumerable An optional `true` to iterate enumerable properties only.
 * @return {Any}
 */
function reduceKeys(callback, initialValue, thisArg, onlyEnumerable) {
    var properties = onlyEnumerable 
                        ? Object.keys(this)
                        : allKeys.call(this);

    var memo = initialValue;

    properties.forEach(function(prop) {
        memo = callback.call(thisArg, memo, this[prop], prop, this);
    }, this);

    return memo;
}


/**
 * An analogue of [filter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter) method of Array prototype.
 * Returns the new object with keys for which callback returns true.
 * Property descriptors of the returned object will have the same `enumerable`, `configurable` and `writable` settings as the properties of `self`. 
 * To filter array-like objects use:
 * ```
 * var result = _.filter(arguments, callback, thisArg);
 * ```
 *
 * @param {Object} self An object which properties will be iterated
 * @param {Function} callback Callback is passed `value`, `key` and `self`. If it returns truthy value, the key/value will be included in the resulting object.
 * @param {Object} thisArg An optional context of iteration (the valueof `this`), will be undefined if this parameter is not passed.
 * @param {Boolean} onlyEnumerable An optional `true` to iterate enumerable properties only.
 * @return {Object}
 */
function filterKeys(callback, thisArg, onlyEnumerable) {
    var descriptors = {};
    eachKey.call(this, filterProperty, thisArg, onlyEnumerable);
    return Object.create(this.constructor.prototype, descriptors);;

    function filterProperty(value, key, self) {
        if (callback.call(this, value, key, self))
            descriptors[key] = Object.getOwnPropertyDescriptor(self, key);
    }
}


var _passed = {}
    , _didNotPass = {};

/**
 * An analogue of [some](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some) method of Array prototype.
 *
 * @param {Object} self An object which properties will be iterated
 * @param {Function} callback Callback is passed `value`, `key` and `self`. If it returns truthy value, the function immeaditely returns `true`.
 * @param {Object} thisArg An optional context of iteration (the valueof `this`), will be undefined if this parameter is not passed.
 * @param {Boolean} onlyEnumerable An optional `true` to iterate enumerable properties only.
 * @return {Boolean}
 */
function someKey(callback, thisArg, onlyEnumerable) {
    try {
        eachKey.call(this, testProperty, thisArg, onlyEnumerable);
    } catch (test) {
        if (test === _passed) return true;
        else throw test;
    }
    return false;

    function testProperty(value, key, self) {
        if (callback.call(this, value, key, self))
            throw _passed;
    }
}


/**
 * An analogue of [every](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every) method of Array prototype.
 *
 * @param {Object} self An object which properties will be iterated
 * @param {Function} callback Callback is passed `value`, `key` and `self`. If it returns falsy value, the function immeaditely returns `false`.
 * @param {Object} thisArg An optional context of iteration (the valueof `this`), will be undefined if this parameter is not passed.
 * @param {Boolean} onlyEnumerable An optional `true` to iterate enumerable properties only.
 * @return {Boolean}
 */
function everyKey(callback, thisArg, onlyEnumerable) {
    try {
        eachKey.call(this, testProperty, thisArg, onlyEnumerable);
    } catch (test) {
        if (test === _didNotPass) return false;
        else throw test;
    }
    return true;

    function testProperty(value, key, self) {
        if (! callback.call(this, value, key, self))
            throw _didNotPass;
    }
}


var ArrayProto = Array.prototype
    , concat = ArrayProto.concat;
/**
 * Returns object of the same class with only specified keys, that are passed as string parameters or array(s) of keys.
 *
 * @param {Object} self an object to pick keys from
 * @param {List[String|Array]} arguments list of keys (or array(s) of keys)
 * @return {Object} 
 */
function pickKeys() { // , ... keys
    var keys = concat.apply(ArrayProto, arguments)
        , obj = Object.create(this.constructor.prototype);
    keys.forEach(function(key) {
        if (this.hasOwnProperty(key))
            obj[key] = this[key];
    }, this);
    return obj;
}


/**
 * Returns object of the same class without specified keys, that are passed as string parameters or array(s) of keys.
 *
 * @param {Object} self an object to omit keys in
 * @param {List[String|Array]} arguments list of keys (or array(s) of keys)
 * @return {Object} 
 */
function omitKeys() { // , ... keys
    var keys = concat.apply(ArrayProto, arguments)
        , obj = clone.call(this);
    keys.forEach(function(key){
        delete obj[key];
    }, this);
    return obj;
}


/**
 * Performs deep equality test of the object. Does not work with recursive objects
 * @param  {Any} self object to compare
 * @param  {Any} obj object to compare
 * @return {Boolean}
 */
function isEqual(obj) {
    if (this === obj) return this !== 0 || 1/this == 1/obj; // 0 and -0 are considered not equal, although 0 === -0 is true
    if (this == null || obj == null) return false;
    var className = this.constructor.name;
    if (className != obj.constructor.name) return false;
    switch (className) {
        case 'String':
            return this == String(obj);
        case 'Number':
            return this != +this ? obj != +obj : (this == 0 ? 1/this == 1/obj : this == +obj);
        case 'Date':
        case 'Boolean':
            return +this == +obj;
        case 'RegExp':
            return this.source == obj.source
                    && this.global == obj.global
                    && this.multiline == obj.multiline
                    && this.ignoreCase == obj.ignoreCase;
    }
    if (typeof this != 'object' || typeof obj != 'object') return false;

    if (Array.isArray(this))
        return this.length == obj.length
                && this.every(function(item, index) {
                    return isEqual.call(item, obj[index]);
                });
    else
        return everyKey.call(this, function(value, key) {
            return isEqual.call(value, obj[key]);
        });
}

},{"./utils":117}],114:[function(require,module,exports){
'use strict';

/**
 * - [extendProto](#extendProto)
 * - [createSubclass](#createSubclass)
 * - [makeSubclass](#makeSubclass)
 * - [newApply](#newApply)
 *
 * These methods can be [chained](proto.js.html#Proto)
 */
var prototypeMethods = module.exports = {
    extendProto: extendProto,
    createSubclass: createSubclass,
    makeSubclass: makeSubclass,
    newApply: newApply
};


var __ = require('./proto_object');

__.extend.call(__, require('./proto_function'));


/**
 * Adds non-enumerable, non-configurable and non-writable properties to the prototype of constructor function.
 * Usage:
 * ```
 * function MyClass() {}
 * _.extendProto(MyClass, {
 *     method1: function() {},
 *     method2: function() {}
 * });
 * ```
 * To extend class via object:
 * ```
 * _.extendProto(obj.constructor, methods);
 * ```
 * Returns passed constructor, so functions _.extendProto, [_.extend](object.js.html#extend) and _.makeSubclass can be [chained](proto.js.html). 
 *
 * @param {Function} self constructor function
 * @param {Object} methods a map of functions, keys will be instance methods (properties of the constructor prototype)
 * @return {Function}
 */
function extendProto(methods) {
    var propDescriptors = {};

    __.eachKey.call(methods, function(method, name) {
        propDescriptors[name] = {
            enumerable: false,
            configurable: false,
            writable: false,
            value: method
        };
    });

    Object.defineProperties(this.prototype, propDescriptors);
    return this;
}


/**
 * Makes a subclass of class `thisClass`.
 * The returned function will have specified `name` if supplied.
 * The constructor of superclass will be called in subclass constructor by default unless `applyConstructor === false` (not just falsy).
 * Copies `thisClass` class methods to created subclass. For them to work correctly they should use `this` to refer to the class rather than explicit superclass name.
 *
 * @param {Function} thisClass A class to make subclass of
 * @param {String} name Optional name of subclass constructor function
 * @param {Boolean} applyConstructor Optional false value (not falsy) to prevent call of inherited constructor in the constructor of subclass
 * @return {Function}
 */
function createSubclass(name, applyConstructor) {
    var thisClass = this;
    var subclass;

    // name is optional
    name = name || '';

    // apply superclass constructor
    var constructorCode = applyConstructor === false
            ? ''
            : 'thisClass.apply(this, arguments);';

    eval('subclass = function ' + name + '(){ ' + constructorCode + ' }');

    makeSubclass.call(subclass, thisClass);

    // copy class methods
    // - for them to work correctly they should not explictly use superclass name
    // and use "this" instead
    __.extend.call(subclass, thisClass, true);

    return subclass;
}


/**
 * Sets up prototype chain to change `thisClass` (a constructor function) so that it becomes a subclass of `Superclass`.
 * Returns `thisClass` so it can be [chained](proto.js.html) with _.extendProto and [_.extend](object.js.html#extend).
 *
 * @param {Function} thisClass A class that will become a subclass of Superclass
 * @param {Function} Superclass A class that will become a superclass of thisClass
 * @return {Function}
 */
function makeSubclass(Superclass) {
    // prototype chain
    this.prototype = Object.create(Superclass.prototype);
    
    // subclass identity
    extendProto.call(this, {
        constructor: this
    });
    return this;
}


/**
 * Calls constructor `this` with arguments passed as array
 * 
 * @param {Function} thisClass A class constructor that will be called
 * @return {Array|Array-like} args Array of arguments that will be passed to constructor
 */
function newApply(args) {
    if (! Array.isArray(args))
        args = Array.prototype.slice.call(args);
    // "null" is context to pass to class constructor, first parameter of bind
    var args = [null].concat(args);
    return new (Function.prototype.bind.apply(this, args));
}

},{"./proto_function":111,"./proto_object":113}],115:[function(require,module,exports){
'use strict';


var __ = require('./proto_object');


/**
 * - [firstUpperCase](#firstUpperCase)
 * - [firstLowerCase](#firstLowerCase)
 * - [toRegExp](#toRegExp)
 * - [toFunction](#toFunction)
 * - [toDate](#toDate)
 * - [toQueryString](#toQueryString)
 * - [fromQueryString](#fromQueryString)
 * - [jsonParse](#jsonParse)
 * - [hashCode](#hashCode)
 * - [unPrefix](#unPrefix)
 */
 var stringMethods = module.exports = {
    firstUpperCase: firstUpperCase,
    firstLowerCase: firstLowerCase,
    toRegExp: toRegExp,
    toFunction: toFunction,
    toDate: toDate,
    toQueryString: toQueryString,
    fromQueryString: fromQueryString,
    jsonParse: jsonParse,
    hashCode: hashCode,
    unPrefix: unPrefix
};


/**
 * Returns string with the first character changed to upper case.
 *
 * @param {String} self A string that will have its first character replaced
 */
function firstUpperCase() {
    return this[0].toUpperCase() + this.slice(1);
}


/**
 * Returns string with the first character changed to lower case.
 *
 * @param {String} self A string that will have its first character replaced
 */
function firstLowerCase() {
    return this[0].toLowerCase() + this.slice(1);
}


/**
 * Converts string created by `toString` method of RegExp back to RegExp
 *
 * @param {String} self string containing regular expression including enclosing "/" symbols and flags
 * @return {RegExp}
 */
function toRegExp() {
    var rx = this.match(regexpStringPattern);
    if (rx) return new RegExp(rx[1], rx[2]);
}
var regexpStringPattern = /^\/(.*)\/([gimy]*)$/;


/**
 * Converts string created by `toString` method of function back to function
 *
 * @param {String} self string containing full function code
 * @return {Function}
 */
function toFunction() {
    var func;
    var code = 'func = ' + this + ';';
    try {
        eval(code);
        return func;
    } catch(e) {
        return;
    }
}


/**
 * Converts string to date in a safe way so that the resiult is undefined if date is invalid
 *
 * @param {String|Date} self string or date object to convert to VALID date
 * @return {[type]} [description]
 */
function toDate() {
    if (! this) return;
    try {
        var date = new Date(this);
    } catch (e) {}
    if (date && date.getTime && !isNaN(date.getTime()))
        return date;
}


/**
 * Convert params object to a url style query string (without "?")
 * 
 * @param {Object} self The object hash to be converted
 * @param {Function} encode optional function used to encode data, encodeURIComponent is used if not specified
 * @return {String} the resulting query string
 */
function toQueryString(encode) {
    var qs = ''
        , params = this || {}
        , encode = encode || encodeURIComponent;

    __.eachKey.call(params, function(value, key) {
        qs += key + '=' + encode(value) + '&';
    });
    
    return qs.slice(0, -1);
}


/**
 * Convert url style query string (without "?") into object hash
 * 
 * @param {String} self The string to be converted
 * @param {Function} decode optional decode function, decodeURIComponent will be used if not supplied
 * @return {Object} The resulting object hash
 */
function fromQueryString(decode) {
    var pairs = this.split('&')
        , results = {}
        , decode = decode || decodeURIComponent;

    pairs.forEach(function(pair) {
        var splitPair = pair.split('=');
        if (splitPair.length < 2) return;
        var key = splitPair[0]
            , value = decode(splitPair[1] || '');
        if (!key) return;
        results[key] = value;
    });

    return results;
}


/**
 * Safe JSON.parse, returns undefined if JSON.parse throws an exception
 *
 * @param {String} self JSON string representation of object
 * @return {Object|undefined}
 */
function jsonParse() {
    try {
        return JSON.parse(this);
    } catch (e) {}
}


/**
 * Dan Bernstein's algorythm to create hash from string
 *
 * @param {String} self string to convert to hash
 * @return {Number}
 */
function hashCode() {
    var hash = 5381
        , str = this
        , len = str.length;
    for (var i = 0; i < len; i++) {
        var char = str.charCodeAt(i);
        hash = ((hash << 5) + hash) + char; /* hash * 33 + c */
    }
    return hash;
}


/**
 * Removes given prefix from the string. If string does not begin from the prefix, returns undefined
 * 
 * @param {String} self
 * @return {String}
 */
function unPrefix(str) {
    if (this.indexOf(str) == 0)
        return this.replace(str, '');
}

},{"./proto_object":113}],116:[function(require,module,exports){
'use strict';

/**
 * - [times](#times)
 * - [repeat](#repeat)
 * - [tap](#tap)
 * - [result](#result)
 * - [identity](#identity)
 */
var utilMethods = module.exports = {
    times: times,
    repeat: repeat,
    tap: tap,
    result: result,
    identity: identity
};


/**
 * Calls `callback` `self` times with `thisArg` as context. Callback is passed iteration index from 0 to `self-1`
 * 
 * @param {Integer} self
 * @param {Function} callback
 * @param {Any} thisArg
 * @return {Array}
 */
function times(callback, thisArg) {
    var arr = Array(Math.max(0, this));
    for (var i = 0; i < this; i++)
        arr[i] = callback.call(thisArg, i);
    return arr;
}


/**
 * Returns array with the first argument repeated `times` times
 * @param  {Any} self
 * @param  {Integer} times
 * @return {Array[Any]}
 */
function repeat(times) {
    var arr = Array(Math.max(0, times));;
    for (var i = 0; i < times; i++)
        arr[i] = this;
    return arr;
}


/**
 * Function to tap into chained methods and to inspect intermediary result
 *
 * @param {Any} self value that's passed between chained methods
 * @param {Function} func function that will be called with the value (both as context and as the first parameter)
 * @return {Any}
 */
function tap(func) {
    func.call(this, this);
    return this;
};


/**
 * Calls function `self` (first parameter of _.result) with given context and arguments
 * 
 * @param {Function|Any} self
 * @param {Any} thisArg context
 * @param {List} arguments extra arguments
 * @return {Any}
 */
function result(thisArg) { //, arguments
    var args = Array.prototype.slice.call(arguments, 1);
    return typeof this == 'function'
            ? this.apply(thisArg, args)
            : this;
}


/**
 * Returns self. Useful for using as an iterator if the actual value needs to be returned. Unlike in underscore and lodash, this function is NOT used as default iterator.
 *
 * @param {Any} self 
 * @return {Any}
 */
function identity() {
    return this;
}

},{}],117:[function(require,module,exports){
'use strict';

var utils = module.exports = {
    makeProtoInstanceMethod: makeProtoInstanceMethod,
    makeProtoFunction: makeProtoFunction,
    makeFindMethod: makeFindMethod
}


function makeProtoInstanceMethod(method) {
    return function() {
        this.self = method.apply(this.self, arguments);
        return this;
    };
}


function makeProtoFunction(method) {
    return function() {
        // when the method is executed, the value of "this" will be arguments[0],
        // other arguments starting from #1 will passed to method as parameters.
        return method.call.apply(method, arguments);
    };
}


var _error = new Error;

/**
 * Returns `find` or `findIndex` method, depending on parameter
 *
 * @param {Function} eachMethod - method to use for iteration (forEach for array or eachKey for object)
 * @param {String} findWhat 'value' - returns find method of Array (implemented in ES6) or findValue method of Object, anything else = returns findIndex/findKey methods.
 * @return {Function}
 */
function makeFindMethod(eachMethod, findWhat) {
    var argIndex = findWhat == 'value' ? 0 : 1;

    return function findValueOrIndex(callback, thisArg, onlyEnumerable) {
        var caughtError;
        try {
            eachMethod.call(this, testItem, thisArg, onlyEnumerable);
        } catch (found) {
            if (found === _error) throw caughtError;
            else return found;
        }
        // if looking for index and not found, return -1
        if (argIndex && eachMethod == Array.prototype.forEach)
            return -1; 

        function testItem(value, index, self) {
            var test;
            try {
                test = callback.call(this, value, index, self);
            } catch(err) {
                caughtError = err;
                throw _error;
            }
            if (test)
                throw arguments[argIndex];
        }
    }
}

},{}]},{},[74])