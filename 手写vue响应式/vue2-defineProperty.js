// Vue 2.0 vue 如和实现 响应式原理 
// 数据变化了 可以更新视图
let oldArrayPrototype = Array.prototype;
let proto = Object.create(oldArrayPrototype); // 继承
['push', 'shift', 'unshift'].forEach(method => {
    proto[method] = function () { //函数劫持 把函数进行重写 内部 继续调用老的方法
        updateView(); // 切片编程
        oldArrayPrototype[method].call(this, ...arguments)
    }
});
function observer(target) {
    if (typeof target !== 'object' || target == null) {
        return target;
    }
    if (Array.isArray(target)) { // 拦截数组 给数组的方法进行了重写 
        Object.setPrototypeOf(target, proto); // 写个循环 赋予给target
        // target.__proto__ = proto;
        for (let i = 0; i < target.length; i++) {
            observer(target[i]);
        }
    } else {
        for (let key in target) {
            defineReactive(target, key, target[key]);
        }
    }

}
function defineReactive(target, key, value) {
    observer(value); // 递归 我就将这个对象 继续拦截
    Object.defineProperty(target, key, {
        get() { // get 中会进行依赖收集
            return value
        },
        set(newValue) {
            if (newValue !== value) {
                observer(newValue)
                updateView();
                value = newValue
            }
        }
    });
}
// 问题 1.如果属性不存在 新增的属性 会是响应式的吗？
function updateView() {
    console.log('更新视图')
}
// 使用 Object.defineProperty 就是可以重新定义属性 给属性增加 getter 和setter
let data = { name: 'zf', age: [1, 2, 3] }
observer(data);
data.age.push(4); // 需要对 数组上的方法进行重写 push shift unshift pop push reverse 


// let data = {name:'zf',age:{n:100}};
// observer(data);
// data.age = {n:200};
// data.age.n = 300;


// Vue3 原理