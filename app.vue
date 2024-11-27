<template>
  <div class="min-h-screen bg-gray-100 py-6">
    <div class="container mx-auto px-4">
      <div class="bg-white shadow-lg rounded-3xl p-8">
        <CategorySelector />
      </div>
    </div>
  </div>
</template>

<script setup>
import CategorySelector from '~/components/CategorySelector.vue'
</script>