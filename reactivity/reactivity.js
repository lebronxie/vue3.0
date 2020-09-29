// 工具方法 创建一个空的对象 freeze 冻结 不可配置 不可修改 可以枚举
// Object.getOwnPropertyDescriptor(obj1,'name') configurable X  writable X  enumerable √
const EMPTY_OBJ = Object.freeze({});
// 原生的浅层拷贝方法
const extend = Object.assign;
// 原生的 hasOwnProperty 判断对象上的属性是否是自身的 而不是继承来的 对象实例上的方法
const hasOwnProperty = Object.prototype.hasOwnProperty;
const hasOwn = (val, key) => hasOwnProperty.call(val, key);
// 数值原生方法 判断时候是数组
const isArray = Array.isArray;
/*
    判断是否是Map 
    const map = new Map 
    Object.prototype.toString.call(map)  ==> [object Map]
*/
const isMap = (val) => toTypeString(val) === '[object Map]';
// 判断是否是函数
const isFunction = (val) => typeof val === 'function';
// 判断是否是字符串
const isString = (val) => typeof val === 'string';
// 判断是否是symbol
const isSymbol = (val) => typeof val === 'symbol';
// 判断是否是 对象 排除null 
const isObject = (val) => val !== null && typeof val === 'object';
// 对象 toString 方法
const objectToString = Object.prototype.toString;
/*
    判断数据类型 [object Number] 
    const num = 10 
    typeof num ===> 'number'
    Object.prototype.tiString.call(num) ==> '[object Number]'

    const num1 = new Number(11)
    typeof num1    ===> 'object'
    Object.prototype.tiString.call(num1) ==> '[object Number]'
*/
const toTypeString = (value) => objectToString.call(value);
// 得到真实的没有加工的没有包装的数据类型 如  '[object Map]'.slice(8, -1) => Map  Function String Number 等
const toRawType = (value) => {
  return toTypeString(value).slice(8, -1);
};
// 判断是否是字符串形式的正整数 key '1' '2'
const isIntegerKey = (key) => isString(key) &&
  key !== 'NaN' &&
  key[0] !== '-' &&
  '' + parseInt(key, 10) === key;
/*
    缓存字符串 方法 不用重复执行 
    cache = {
      abc: "Abc"
      ccc: "Ccc"
    }
*/
const cacheStringFunction = (fn) => {
  const cache = Object.create(null);
  return ((str) => {
    const hit = cache[str];
    return hit || (cache[str] = fn(str));
  });
};
/**
 * @private
 */
// 转成 以大写字母写
const capitalize = cacheStringFunction((str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
});
/*
    compare whether a value has changed, accounting for NaN. 比较一个值是否改变 包括NaN
*/
const hasChanged = (value, oldValue) => value !== oldValue && (value === value || oldValue === oldValue);
// 封装 defineProperty
const def = (obj, key, value) => {
  Object.defineProperty(obj, key, {
    // 可配置
    configurable: true,
    // 不可枚举
    enumerable: false,
    value
  });
};
/*
    WeakMap 介绍
    在 JavaScript 里，map API 可以通过使其四个 API 方法共用两个数组(一个存放键,一个存放值)来实现。
    给这种 map 设置值时会同时将键和值添加到这两个数组的末尾。从而使得键和值的索引在两个数组中相对应。
    当从该 map 取值的时候，需要遍历所有的键，然后使用索引从存储值的数组中检索出相应的值。
    但这样的实现会有两个很大的缺点，首先赋值和搜索操作都是 O(n) 的时间复杂度( n 是键值对的个数)，
    因为这两个操作都需要遍历全部整个数组来进行匹配。另外一个缺点是可能会导致内存泄漏，
    因为数组会一直引用着每个键和值。这种引用使得垃圾回收算法不能回收处理他们，即使没有其他任何引用存在了。
    相比之下，原生的 WeakMap 持有的是每个键对象的“弱引用”，这意味着在没有其他引用存在时垃圾回收能正确进行。
    原生 WeakMap 的结构是特殊且有效的，其用于映射的 key 只有在其没有被回收时才是有效的。
    正由于这样的弱引用，WeakMap 的 key 是不可枚举的 (没有方法能给出所有的 key)。如果key 是可枚举的话，其列表将会受垃圾回收机制的影响，
    从而得到不确定的结果。因此，如果你想要这种类型对象的 key 值的列表，你应该使用 Map。
    基本上，如果你要往对象上添加数据，又不想干扰垃圾回收机制，就可以使用 WeakMap。
*/

// 响应式相关

// 所有需要响应式数据 data
const targetMap = new WeakMap();
// 副作用执行栈
const effectStack = [];
// 当前的 副作用函数
let activeEffect;
// 迭代 常量  iterate
const ITERATE_KEY = Symbol('iterate');
// Map key iterate
const MAP_KEY_ITERATE_KEY = Symbol('Map key iterate');
// 判断函数是否是effect   _isEffect
function isEffect(fn) {
  return fn && fn._isEffect === true;
}
// 全局的 effect 函数 
function effect(fn, options = EMPTY_OBJ) {
  if (isEffect(fn)) {
    fn = fn.raw;
  }
  const effect = createReactiveEffect(fn, options);
  if (!options.lazy) {
    effect();
  }
  return effect;
}
// 停止 某一个 effect
function stop(effect) {
  if (effect.active) {
    cleanup(effect);
    if (effect.options.onStop) {
      effect.options.onStop();
    }
    effect.active = false;
  }
}
// 唯一id
let uid = 0;
// 创建响应式的 effect
function createReactiveEffect(fn, options) {
  const effect = function reactiveEffect() {
    if (!effect.active) {
      return options.scheduler ? undefined : fn();
    }
    if (!effectStack.includes(effect)) {
      cleanup(effect);
      try {
        enableTracking();
        effectStack.push(effect);
        activeEffect = effect;
        return fn();
      }
      finally {
        effectStack.pop();
        resetTracking();
        activeEffect = effectStack[effectStack.length - 1];
      }
    }
  };
  effect.id = uid++;
  effect._isEffect = true;
  effect.active = true;
  effect.raw = fn;
  effect.deps = [];
  effect.options = options;
  return effect;
}
// 清除所有 effect
function cleanup(effect) {
  const { deps } = effect;
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].delete(effect);
    }
    deps.length = 0;
  }
}
// 是否应该 track 收集 追踪data
let shouldTrack = true;
// 追踪data 的 栈 数组
const trackStack = [];
// 暂停 追踪
function pauseTracking() {
  trackStack.push(shouldTrack);
  shouldTrack = false;
}
// 变成可追踪
function enableTracking() {
  trackStack.push(shouldTrack);
  shouldTrack = true;
}
// 重置 是否能追踪
function resetTracking() {
  const last = trackStack.pop();
  shouldTrack = last === undefined ? true : last;
}
// 追踪函数
function track(target, type, key) {
  if (!shouldTrack || activeEffect === undefined) {
    return;
  }
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, (dep = new Set()));
  }
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
    if (activeEffect.options.onTrack) {
      activeEffect.options.onTrack({
        effect: activeEffect,
        target,
        type,
        key
      });
    }
  }
}
// 触发更新函数
function trigger(target, type, key, newValue, oldValue, oldTarget) {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    // never been tracked
    return;
  }
  const effects = new Set();
  const add = (effectsToAdd) => {
    if (effectsToAdd) {
      effectsToAdd.forEach(effect => {
        if (effect !== activeEffect || effect.options.allowRecurse) {
          effects.add(effect);
        }
      });
    }
  };
  if (type === "clear" /* CLEAR */) {
    // collection being cleared
    // trigger all effects for target
    depsMap.forEach(add);
  }
  else if (key === 'length' && isArray(target)) {
    depsMap.forEach((dep, key) => {
      if (key === 'length' || key >= newValue) {
        add(dep);
      }
    });
  }
  else {
    // schedule runs for SET | ADD | DELETE
    if (key !== void 0) {
      add(depsMap.get(key));
    }
    // also run for iteration key on ADD | DELETE | Map.SET
    switch (type) {
      case "add" /* ADD */:
        if (!isArray(target)) {
          add(depsMap.get(ITERATE_KEY));
          if (isMap(target)) {
            add(depsMap.get(MAP_KEY_ITERATE_KEY));
          }
        }
        else if (isIntegerKey(key)) {
          // new index added to array -> length changes
          add(depsMap.get('length'));
        }
        break;
      case "delete" /* DELETE */:
        if (!isArray(target)) {
          add(depsMap.get(ITERATE_KEY));
          if (isMap(target)) {
            add(depsMap.get(MAP_KEY_ITERATE_KEY));
          }
        }
        break;
      case "set" /* SET */:
        if (isMap(target)) {
          add(depsMap.get(ITERATE_KEY));
        }
        break;
    }
  }
  const run = (effect) => {
    if (effect.options.onTrigger) {
      effect.options.onTrigger({
        effect,
        target,
        key,
        type,
        newValue,
        oldValue,
        oldTarget
      });
    }
    if (effect.options.scheduler) {
      effect.options.scheduler(effect);
    }
    else {
      effect();
    }
  };
  effects.forEach(run);
}
/*
  0:  value: Symbol(Symbol.asyncIterator)
  1:  value: Symbol(Symbol.hasInstance)
  2:  value: Symbol(Symbol.isConcatSpreadable)
  3:  value: Symbol(Symbol.iterator)
  4:  value: Symbol(Symbol.match)
  5:  value: Symbol(Symbol.matchAll)
  6:  value: Symbol(Symbol.replace)
  7:  value: Symbol(Symbol.search)
  8:  value: Symbol(Symbol.species)
  9:  value: Symbol(Symbol.split)
  10: value: Symbol(Symbol.toPrimitive)
  11: value: Symbol(Symbol.toStringTag)
  12: value: Symbol(Symbol.unscopables)
  13: value: Symbol(observable)
*/
const builtInSymbols = new Set(Object.getOwnPropertyNames(Symbol)
  .map(key => Symbol[key])
  .filter(isSymbol));
// proxy get 函数 baseHandler 
const get = /*#__PURE__*/ createGetter();
// 浅层 get handler
const shallowGet = /*#__PURE__*/ createGetter(false, true);
// 只读 get handler
const readonlyGet = /*#__PURE__*/ createGetter(true);
// 浅层只读
const shallowReadonlyGet = /*#__PURE__*/ createGetter(true, true);
// 监听数组的仪器
/*
  includes: ƒ (...args)
  indexOf: ƒ (...args)
  lastIndexOf: ƒ (...args)
  pop: ƒ (...args)
  push: ƒ (...args)
  shift: ƒ (...args)
  splice: ƒ (...args)
  unshift: ƒ (...args)
*/
const arrayInstrumentations = {};
['includes', 'indexOf', 'lastIndexOf'].forEach(key => {
  const method = Array.prototype[key];
  arrayInstrumentations[key] = function (...args) {
    const arr = toRaw(this);
    for (let i = 0, l = this.length; i < l; i++) {
      track(arr, "get" /* GET */, i + '');
    }
    // we run the method using the original args first (which may be reactive)
    const res = method.apply(arr, args);
    if (res === -1 || res === false) {
      // if that didn't work, run it again using raw values.
      return method.apply(arr, args.map(toRaw));
    }
    else {
      return res;
    }
  };
});
['push', 'pop', 'shift', 'unshift', 'splice'].forEach(key => {
  const method = Array.prototype[key];
  arrayInstrumentations[key] = function (...args) {
    pauseTracking();
    const res = method.apply(this, args);
    enableTracking();
    return res;
  };
});
// 创建 getter的 函数
function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    if (key === "__v_isReactive" /* IS_REACTIVE */) {
      return !isReadonly;
    }
    else if (key === "__v_isReadonly" /* IS_READONLY */) {
      return isReadonly;
    }
    else if (key === "__v_raw" /* RAW */ &&
      receiver === (isReadonly ? readonlyMap : reactiveMap).get(target)) {
      return target;
    }
    const targetIsArray = isArray(target);
    if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
      return Reflect.get(arrayInstrumentations, key, receiver);
    }
    const res = Reflect.get(target, key, receiver);
    const keyIsSymbol = isSymbol(key);
    if (keyIsSymbol
      ? builtInSymbols.has(key)
      : key === `__proto__` || key === `__v_isRef`) {
      return res;
    }
    if (!isReadonly) {
      track(target, "get" /* GET */, key);
    }
    if (shallow) {
      return res;
    }
    if (isRef(res)) {
      // ref unwrapping - does not apply for Array + integer key.
      const shouldUnwrap = !targetIsArray || !isIntegerKey(key);
      return shouldUnwrap ? res.value : res;
    }
    if (isObject(res)) {
      // Convert returned value into a proxy as well. we do the isObject check
      // here to avoid invalid value warning. Also need to lazy access readonly
      // and reactive here to avoid circular dependency.
      return isReadonly ? readonly(res) : reactive(res);
    }
    return res;
  };
}
// proxy中的 set handler 通过get函数构造出来
const set = /*#__PURE__*/ createSetter();
const shallowSet = /*#__PURE__*/ createSetter(true);
// 构造setter 函数
function createSetter(shallow = false) {
  return function set(target, key, value, receiver) {
    const oldValue = target[key];
    if (!shallow) {
      value = toRaw(value);
      if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
        oldValue.value = value;
        return true;
      }
    }
    const hadKey = isArray(target) && isIntegerKey(key)
      ? Number(key) < target.length
      : hasOwn(target, key);
    const result = Reflect.set(target, key, value, receiver);
    // don't trigger if target is something up in the prototype chain of original
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, "add" /* ADD */, key, value);
      }
      else if (hasChanged(value, oldValue)) {
        trigger(target, "set" /* SET */, key, value, oldValue);
      }
    }
    return result;
  };
}
// proxy中的 删除handler 
function deleteProperty(target, key) {
  const hadKey = hasOwn(target, key);
  const oldValue = target[key];
  const result = Reflect.deleteProperty(target, key);
  if (result && hadKey) {
    trigger(target, "delete" /* DELETE */, key, undefined, oldValue);
  }
  return result;
}
// proxy 中的判断是否有某一key handler
function has(target, key) {
  const result = Reflect.has(target, key);
  if (!isSymbol(key) || !builtInSymbols.has(key)) {
    track(target, "has" /* HAS */, key);
  }
  return result;
}
// proxy 中的 ownkeys handler
function ownKeys(target) {
  track(target, "iterate" /* ITERATE */, ITERATE_KEY);
  return Reflect.ownKeys(target);
}
// 可变的 操作的 proxy内部函数
const mutableHandlers = {
  get,
  set,
  deleteProperty,
  has,
  ownKeys
};
// 只读 handler
const readonlyHandlers = {
  get: readonlyGet,
  set(target, key) {
    {
      console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
    }
    return true;
  },
  deleteProperty(target, key) {
    {
      console.warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
    }
    return true;
  }
};
// 浅层响应式 handler
const shallowReactiveHandlers = extend({}, mutableHandlers, {
  get: shallowGet,
  set: shallowSet
});
// Props handlers are special in the sense that it should not unwrap top-level
// refs (in order to allow refs to be explicitly passed down), but should
// retain the reactivity of the normal readonly object.
// 浅层 可读 handler
const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
  get: shallowReadonlyGet
});

// 变成响应式
const toReactive = (value) => isObject(value) ? reactive(value) : value;
// 变成只读
const toReadonly = (value) => isObject(value) ? readonly(value) : value;
// 变成浅层 ？？
const toShallow = (value) => value;
// 获取 原型
const getProto = (v) => Reflect.getPrototypeOf(v);


function get$1(target, key, isReadonly = false, isShallow = false) {
  // #1772: readonly(reactive(Map)) should return readonly + reactive version
  // of the value
  target = target["__v_raw" /* RAW */];
  const rawTarget = toRaw(target);
  const rawKey = toRaw(key);
  if (key !== rawKey) {
    !isReadonly && track(rawTarget, "get" /* GET */, key);
  }
  !isReadonly && track(rawTarget, "get" /* GET */, rawKey);
  const { has } = getProto(rawTarget);
  const wrap = isReadonly ? toReadonly : isShallow ? toShallow : toReactive;
  if (has.call(rawTarget, key)) {
    return wrap(target.get(key));
  }
  else if (has.call(rawTarget, rawKey)) {
    return wrap(target.get(rawKey));
  }
}
function has$1(key, isReadonly = false) {
  const target = this["__v_raw" /* RAW */];
  const rawTarget = toRaw(target);
  const rawKey = toRaw(key);
  if (key !== rawKey) {
    !isReadonly && track(rawTarget, "has" /* HAS */, key);
  }
  !isReadonly && track(rawTarget, "has" /* HAS */, rawKey);
  return key === rawKey
    ? target.has(key)
    : target.has(key) || target.has(rawKey);
}
function size(target, isReadonly = false) {
  target = target["__v_raw" /* RAW */];
  !isReadonly && track(toRaw(target), "iterate" /* ITERATE */, ITERATE_KEY);
  return Reflect.get(target, 'size', target);
}
function add(value) {
  value = toRaw(value);
  const target = toRaw(this);
  const proto = getProto(target);
  const hadKey = proto.has.call(target, value);
  const result = target.add(value);
  if (!hadKey) {
    trigger(target, "add" /* ADD */, value, value);
  }
  return result;
}
function set$1(key, value) {
  value = toRaw(value);
  const target = toRaw(this);
  const { has, get } = getProto(target);
  let hadKey = has.call(target, key);
  if (!hadKey) {
    key = toRaw(key);
    hadKey = has.call(target, key);
  }
  else {
    checkIdentityKeys(target, has, key);
  }
  const oldValue = get.call(target, key);
  const result = target.set(key, value);
  if (!hadKey) {
    trigger(target, "add" /* ADD */, key, value);
  }
  else if (hasChanged(value, oldValue)) {
    trigger(target, "set" /* SET */, key, value, oldValue);
  }
  return result;
}
function deleteEntry(key) {
  const target = toRaw(this);
  const { has, get } = getProto(target);
  let hadKey = has.call(target, key);
  if (!hadKey) {
    key = toRaw(key);
    hadKey = has.call(target, key);
  }
  else {
    checkIdentityKeys(target, has, key);
  }
  const oldValue = get ? get.call(target, key) : undefined;
  // forward the operation before queueing reactions
  const result = target.delete(key);
  if (hadKey) {
    trigger(target, "delete" /* DELETE */, key, undefined, oldValue);
  }
  return result;
}
function clear() {
  const target = toRaw(this);
  const hadItems = target.size !== 0;
  const oldTarget = isMap(target)
    ? new Map(target)
    : new Set(target)
    ;
  // forward the operation before queueing reactions
  const result = target.clear();
  if (hadItems) {
    trigger(target, "clear" /* CLEAR */, undefined, undefined, oldTarget);
  }
  return result;
}
function createForEach(isReadonly, isShallow) {
  return function forEach(callback, thisArg) {
    const observed = this;
    const target = observed["__v_raw" /* RAW */];
    const rawTarget = toRaw(target);
    const wrap = isReadonly ? toReadonly : isShallow ? toShallow : toReactive;
    !isReadonly && track(rawTarget, "iterate" /* ITERATE */, ITERATE_KEY);
    return target.forEach((value, key) => {
      // important: make sure the callback is
      // 1. invoked with the reactive map as `this` and 3rd arg
      // 2. the value received should be a corresponding reactive/readonly.
      return callback.call(thisArg, wrap(value), wrap(key), observed);
    });
  };
}
function createIterableMethod(method, isReadonly, isShallow) {
  return function (...args) {
    const target = this["__v_raw" /* RAW */];
    const rawTarget = toRaw(target);
    const targetIsMap = isMap(rawTarget);
    const isPair = method === 'entries' || (method === Symbol.iterator && targetIsMap);
    const isKeyOnly = method === 'keys' && targetIsMap;
    const innerIterator = target[method](...args);
    const wrap = isReadonly ? toReadonly : isShallow ? toShallow : toReactive;
    !isReadonly &&
      track(rawTarget, "iterate" /* ITERATE */, isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY);
    // return a wrapped iterator which returns observed versions of the
    // values emitted from the real iterator
    return {
      // iterator protocol
      next() {
        const { value, done } = innerIterator.next();
        return done
          ? { value, done }
          : {
            value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
            done
          };
      },
      // iterable protocol
      [Symbol.iterator]() {
        return this;
      }
    };
  };
}
function createReadonlyMethod(type) {
  return function (...args) {
    {
      const key = args[0] ? `on key "${args[0]}" ` : ``;
      console.warn(`${capitalize(type)} operation ${key}failed: target is readonly.`, toRaw(this));
    }
    return type === "delete" /* DELETE */ ? false : this;
  };
}
const mutableInstrumentations = {
  get(key) {
    return get$1(this, key);
  },
  get size() {
    return size(this);
  },
  has: has$1,
  add,
  set: set$1,
  delete: deleteEntry,
  clear,
  forEach: createForEach(false, false)
};
const shallowInstrumentations = {
  get(key) {
    return get$1(this, key, false, true);
  },
  get size() {
    return size(this);
  },
  has: has$1,
  add,
  set: set$1,
  delete: deleteEntry,
  clear,
  forEach: createForEach(false, true)
};
const readonlyInstrumentations = {
  get(key) {
    return get$1(this, key, true);
  },
  get size() {
    return size(this, true);
  },
  has(key) {
    return has$1.call(this, key, true);
  },
  add: createReadonlyMethod("add" /* ADD */),
  set: createReadonlyMethod("set" /* SET */),
  delete: createReadonlyMethod("delete" /* DELETE */),
  clear: createReadonlyMethod("clear" /* CLEAR */),
  forEach: createForEach(true, false)
};
const iteratorMethods = ['keys', 'values', 'entries', Symbol.iterator];
iteratorMethods.forEach(method => {
  mutableInstrumentations[method] = createIterableMethod(method, false, false);
  readonlyInstrumentations[method] = createIterableMethod(method, true, false);
  shallowInstrumentations[method] = createIterableMethod(method, false, true);
});
function createInstrumentationGetter(isReadonly, shallow) {
  const instrumentations = shallow
    ? shallowInstrumentations
    : isReadonly
      ? readonlyInstrumentations
      : mutableInstrumentations;
  return (target, key, receiver) => {
    if (key === "__v_isReactive" /* IS_REACTIVE */) {
      return !isReadonly;
    }
    else if (key === "__v_isReadonly" /* IS_READONLY */) {
      return isReadonly;
    }
    else if (key === "__v_raw" /* RAW */) {
      return target;
    }
    return Reflect.get(hasOwn(instrumentations, key) && key in target
      ? instrumentations
      : target, key, receiver);
  };
}
const mutableCollectionHandlers = {
  get: createInstrumentationGetter(false, false)
};
const shallowCollectionHandlers = {
  get: createInstrumentationGetter(false, true)
};
const readonlyCollectionHandlers = {
  get: createInstrumentationGetter(true, false)
};
function checkIdentityKeys(target, has, key) {
  const rawKey = toRaw(key);
  if (rawKey !== key && has.call(target, rawKey)) {
    const type = toRawType(target);
    console.warn(`Reactive ${type} contains both the raw and reactive ` +
      `versions of the same object${type === `Map` ? `as keys` : ``}, ` +
      `which can lead to inconsistencies. ` +
      `Avoid differentiating between the raw and reactive versions ` +
      `of an object and only use the reactive version if possible.`);
  }
}

const reactiveMap = new WeakMap();
const readonlyMap = new WeakMap();
function targetTypeMap(rawType) {
  switch (rawType) {
    case 'Object':
    case 'Array':
      return 1 /* COMMON */;
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return 2 /* COLLECTION */;
    default:
      return 0 /* INVALID */;
  }
}
function getTargetType(value) {
  return value["__v_skip" /* SKIP */] || !Object.isExtensible(value)
    ? 0 /* INVALID */
    : targetTypeMap(toRawType(value));
}
function reactive(target) {
  // if trying to observe a readonly proxy, return the readonly version.
  if (target && target["__v_isReadonly" /* IS_READONLY */]) {
    return target;
  }
  return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers);
}
// Return a reactive-copy of the original object, where only the root level
// properties are reactive, and does NOT unwrap refs nor recursively convert
// returned properties.
function shallowReactive(target) {
  return createReactiveObject(target, false, shallowReactiveHandlers, shallowCollectionHandlers);
}
function readonly(target) {
  return createReactiveObject(target, true, readonlyHandlers, readonlyCollectionHandlers);
}
// Return a reactive-copy of the original object, where only the root level
// properties are readonly, and does NOT unwrap refs nor recursively convert
// returned properties.
// This is used for creating the props proxy object for stateful components.
function shallowReadonly(target) {
  return createReactiveObject(target, true, shallowReadonlyHandlers, readonlyCollectionHandlers);
}
function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers) {
  if (!isObject(target)) {
    {
      console.warn(`value cannot be made reactive: ${String(target)}`);
    }
    return target;
  }
  // target is already a Proxy, return it.
  // exception: calling readonly() on a reactive object
  if (target["__v_raw" /* RAW */] &&
    !(isReadonly && target["__v_isReactive" /* IS_REACTIVE */])) {
    return target;
  }
  // target already has corresponding Proxy
  const proxyMap = isReadonly ? readonlyMap : reactiveMap;
  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }
  // only a whitelist of value types can be observed.
  const targetType = getTargetType(target);
  if (targetType === 0 /* INVALID */) {
    return target;
  }
  const proxy = new Proxy(target, targetType === 2 /* COLLECTION */ ? collectionHandlers : baseHandlers);
  proxyMap.set(target, proxy);
  return proxy;
}
function isReactive(value) {
  if (isReadonly(value)) {
    return isReactive(value["__v_raw" /* RAW */]);
  }
  return !!(value && value["__v_isReactive" /* IS_REACTIVE */]);
}
function isReadonly(value) {
  return !!(value && value["__v_isReadonly" /* IS_READONLY */]);
}
function isProxy(value) {
  return isReactive(value) || isReadonly(value);
}
function toRaw(observed) {
  return ((observed && toRaw(observed["__v_raw" /* RAW */])) || observed);
}
function markRaw(value) {
  def(value, "__v_skip" /* SKIP */, true);
  return value;
}

const convert = (val) => isObject(val) ? reactive(val) : val;
function isRef(r) {
  return Boolean(r && r.__v_isRef === true);
}
function ref(value) {
  return createRef(value);
}
function shallowRef(value) {
  return createRef(value, true);
}
// ref 相关
class RefImpl {
  constructor(_rawValue, _shallow = false) {
    this._rawValue = _rawValue;
    this._shallow = _shallow;
    this.__v_isRef = true;
    this._value = _shallow ? _rawValue : convert(_rawValue);
  }
  get value() {
    track(toRaw(this), "get" /* GET */, 'value');
    return this._value;
  }
  set value(newVal) {
    if (hasChanged(toRaw(newVal), this._rawValue)) {
      this._rawValue = newVal;
      this._value = this._shallow ? newVal : convert(newVal);
      trigger(toRaw(this), "set" /* SET */, 'value', newVal);
    }
  }
}
function createRef(rawValue, shallow = false) {
  if (isRef(rawValue)) {
    return rawValue;
  }
  return new RefImpl(rawValue, shallow);
}
function triggerRef(ref) {
  trigger(ref, "set" /* SET */, 'value', ref.value);
}
function unref(ref) {
  return isRef(ref) ? ref.value : ref;
}
const shallowUnwrapHandlers = {
  get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
  set: (target, key, value, receiver) => {
    const oldValue = target[key];
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value;
      return true;
    }
    else {
      return Reflect.set(target, key, value, receiver);
    }
  }
};
function proxyRefs(objectWithRefs) {
  return isReactive(objectWithRefs)
    ? objectWithRefs
    : new Proxy(objectWithRefs, shallowUnwrapHandlers);
}
// 自定义 Ref
class CustomRefImpl {
  constructor(factory) {
    this.__v_isRef = true;
    const { get, set } = factory(() => track(this, "get" /* GET */, 'value'), () => trigger(this, "set" /* SET */, 'value'));
    this._get = get;
    this._set = set;
  }
  get value() {
    return this._get();
  }
  set value(newVal) {
    this._set(newVal);
  }
}
function customRef(factory) {
  return new CustomRefImpl(factory);
}
function toRefs(object) {
  if (!isProxy(object)) {
    console.warn(`toRefs() expects a reactive object but received a plain one.`);
  }
  const ret = isArray(object) ? new Array(object.length) : {};
  for (const key in object) {
    ret[key] = toRef(object, key);
  }
  return ret;
}
// 对象 Ref
class ObjectRefImpl {
  constructor(_object, _key) {
    this._object = _object;
    this._key = _key;
    this.__v_isRef = true;
  }
  get value() {
    return this._object[this._key];
  }
  set value(newVal) {
    this._object[this._key] = newVal;
  }
}
function toRef(object, key) {
  return isRef(object[key])
    ? object[key]
    : new ObjectRefImpl(object, key);
}
// 计算属性
class ComputedRefImpl {
  constructor(getter, _setter, isReadonly) {
    this._setter = _setter;
    this._dirty = true;
    this.__v_isRef = true;
    // 这里调用 全局的 function effect 函数
    this.effect = effect(getter, {
      lazy: true,
      scheduler: () => {
        if (!this._dirty) {
          this._dirty = true;
          trigger(toRaw(this), "set" /* SET */, 'value');
        }
      }
    });
    this["__v_isReadonly" /* IS_READONLY */] = isReadonly;
  }
  get value() {
    if (this._dirty) {
      this._value = this.effect();
      this._dirty = false;
    }
    track(toRaw(this), "get" /* GET */, 'value');
    return this._value;
  }
  set value(newValue) {
    this._setter(newValue);
  }
}
function computed(getterOrOptions) {
  let getter;
  let setter;
  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions;
    setter = () => {
      console.warn('Write operation failed: computed value is readonly');
    }
      ;
  }
  else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }
  return new ComputedRefImpl(getter, setter, isFunction(getterOrOptions) || !getterOrOptions.set);
}

/* export { ITERATE_KEY, computed, customRef, effect, enableTracking, isProxy, isReactive, isReadonly, isRef, markRaw,
  pauseTracking, proxyRefs, reactive, readonly, ref, resetTracking, shallowReactive, shallowReadonly, shallowRef, stop,
  toRaw, toRef, toRefs, track, trigger, triggerRef, unref };
*/
