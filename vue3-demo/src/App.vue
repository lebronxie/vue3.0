<template>
  <div>
    <button @click="addMyCount">count is: {{ count }}</button>
  </div>
</template>

<script>
import { ref, isRef } from 'vue'
export default {
  name: 'App',
  // data() {
  //   return {
  //     count: 10086
  //   }
  // },
  // methods: {
  //   add() {
  //     this.count += 1000
  //   }
  // }
  setup() {
    // debugger
    const count = ref(10086)
    function addMyCount() {
      // debugger
      count.value += 100
    }
    return {
      count,
      addMyCount
    }
  }
}
</script>
