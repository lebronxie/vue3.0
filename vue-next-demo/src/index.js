import { reactive } from '@vue/reactivity'
const obj = {
  name: "lebron"
}
const reactiveObj = reactive(obj)
reactiveObj.age = 23
console.log(reactiveObj)
// console.log(reactiveObj)
// reactiveObj.name = 'xie'
// console.log(reactiveObj)
// console.log(obj)
// obj.name = 'hhh'
// console.log(obj)
// console.log(reactiveObj)

