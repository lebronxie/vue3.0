<template>
  <div>
    <h1>{{ msg }}</h1>
    <button @click="add">count is: {{ count }}</button>
  </div>
</template>

<script>
import { ref, isRef } from 'vue'
export default {
  name: 'HelloWorld',
  props: {
    msg: String
  },
  // data() {
  //   return {
  //     count: 0
  //   }
  // }
  setup(props) {
    debugger
    const count = ref(10086)
    function add() {
      count.value += 100
    }
    return {
      count,
      add
    }
  }
}
</script>
