<template>
  <div class="navbar bg-base-100 min-h-0 p-0">
    <div class="navbar-start">
      <div class="dropdown">
        <div tabindex="0" role="button" class="btn btn-ghost lg:hidden">
          <i class="fa-solid fa-bars text-xl"></i>
        </div>
        <ul
          tabindex="0"
          class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
        >
          <li><RouterLink :to="{ name: 'recording' }">Recording</RouterLink></li>
          <li><RouterLink :to="{ name: 'recording' }">Analysis</RouterLink></li>
          <li><RouterLink :to="{ name: 'recording' }">Experiments</RouterLink></li>
          <li><RouterLink :to="{ name: 'recording' }">Documentation</RouterLink></li>
        </ul>
      </div>
      <a class="btn btn-ghost text-xl text-primary">
        <i class="fa-solid fa-cubes text-2xl"></i> Tesseract Synapse
      </a>
    </div>
    <div class="navbar-end hidden lg:flex">
      <ul class="menu menu-horizontal px-1">
        <li><RouterLink :to="{ name: 'recording' }">Recording</RouterLink></li>
        <li><RouterLink :to="{ name: 'recording' }">Analysis</RouterLink></li>
        <li><RouterLink :to="{ name: 'recording' }">Experiments</RouterLink></li>
        <li><RouterLink :to="{ name: 'recording' }">Documentation</RouterLink></li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>
