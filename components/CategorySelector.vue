<template>
  <div class="w-full">
    <div class="bg-white rounded-lg">
      <h2 class="text-2xl font-semibold text-gray-800 mb-4">Category Search</h2>
      
      <div class="flex space-x-4 mb-6">
        <select
          id="category"
          v-model="selectedCategory"
          :disabled="loading || error"
          class="flex-grow block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
          <option value="">Select a category</option>
          <option v-for="category in categories" :key="category.name" :value="category.name">
            {{ category.name }}
          </option>
        </select>
        <button
          @click="handleSearch"
          :disabled="!selectedCategory || loading"
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ loading ? 'Searching...' : 'Search' }}</span>
        </button>
      </div>
      
      <div class="mb-6 flex space-x-4">
        <input type="file" ref="fileInput" @change="onFileUpload" accept=".xls,.xlsx" class="hidden" />
        <button @click="$refs.fileInput.click()" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
          Import XLS
        </button>
        <button @click="showResetConfirmation = true" class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
          Reset All Category's Balance SO IQ SQ to 0
        </button>
        <div class="flex space-x-4">
          <div class="flex flex-col">
            <label class="text-sm text-gray-600">From Date</label>
            <input type="text" :value="mainDates.from_date" readonly class="mt-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm" />
          </div>
          <div class="flex flex-col">
            <label class="text-sm text-gray-600">To Date</label>
            <input type="text" :value="mainDates.to_date" readonly class="mt-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm" />
          </div>
          <div class="flex flex-col">
            <label class="text-sm text-gray-600">Date</label>
            <input type="text" :value="mainDates.updated_at" readonly class="mt-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm" />
          </div>
        </div>
      </div>

      <div v-if="itemInfo && itemInfo.length > 0" class="mb-6">
        <input
          v-model="itemSearchQuery"
          type="text"
          placeholder="Search items..."
          class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div v-if="itemInfo && itemInfo.length > 0" class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 table-fixed">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r w-8">No.</th>
              <th scope="col" class="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r w-24">Item Name</th>
              <th scope="col" class="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r w-20">Balance</th>
              <th scope="col" class="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r w-20">SOdata</th>
              <th scope="col" class="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r w-20">IQdata</th>
              <th scope="col" class="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r w-20">SQdata</th>
              <th scope="col" class="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r w-64">Extra Remark</th>
              <th scope="col" class="px-1 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-56">Additional Info</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="(item, index) in filteredItems" :key="item.item_id">
              <td class="px-1 py-1 whitespace-nowrap text-sm font-medium text-gray-900 border-r">{{ index + 1 }}</td>
              <td class="px-1 py-1 whitespace-nowrap text-sm font-medium text-gray-900 border-r">
                <div class="flex flex-col items-start">
                  <span class="truncate">{{ item.name || '' }}</span>
                  <input
                    v-model="item.item_remark"
                    type="text"
                    class="mt-1 block w-full px-2 py-1 text-xs border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                    @blur="updateItemRemark(item)"
                    placeholder=""
                  />
                  <button
                    @click="confirmDelist(item)"
                    class="mt-1 inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Delist
                  </button>
                </div>
              </td>
              <td class="px-1 py-1 whitespace-nowrap text-sm text-gray-500 border-r">
                <input
                  v-model="item.balance"
                  type="number"
                  class="block w-full px-1 py-1 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                  @blur="updateBalance(item)"
                />
              </td>
              <td class="px-1 py-1 whitespace-nowrap text-sm text-gray-500 border-r">
                <input
                  v-model="item.so"
                  type="number"
                  class="block w-full px-1 py-1 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                  @blur="updateSO(item)"
                />
              </td>
              <td class="px-1 py-1 whitespace-nowrap text-sm text-gray-500 border-r">
                <input
                  v-model="item.iq"
                  type="number"
                  class="block w-full px-1 py-1 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                  @blur="updateIQ(item)"
                />
              </td>
              <td class="px-1 py-1 whitespace-nowrap text-sm text-gray-500 border-r">
                <input
                  v-model="item.sq"
                  type="number"
                  class="block w-full px-1 py-1 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                  @blur="updateSQ(item)"
                />
              </td>
              <td class="px-1 py-1 whitespace-nowrap text-sm text-gray-500 border-r">
                <div class="flex flex-col space-y-2">
                  <input
                    v-model="item.extra_remark"
                    type="text"
                    class="block w-full px-2 py-1 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md"
                    @blur="updateExtraRemark(item)"
                  />
                  <div class="flex space-x-2">
                    <button
                      @click="moveToHistory(item)"
                      class="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Move the remark to history
                    </button>
                    <button
                      @click="showHistory(item)"
                      class="inline-flex items-center p-1 border border-transparent text-xs font-medium rounded text-white bg-gray-500 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                      title="View History"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </td>
              <td class="px-1 py-1 text-sm text-gray-500">
                <div v-if="item.loadingAdditionalInfo" class="text-blue-600">Loading...</div>
                <div v-else-if="item.additionalInfo" class="flex overflow-x-auto">
                  <div v-for="(info, index) in item.additionalInfo" :key="index" 
                       class="flex-shrink-0 mr-2 last:mr-0">
                    <div :class="['bg-gray-100 rounded-lg p-1 text-xs', {'border-2 border-red-500': info.status === 1}]">
                      <p><span class="font-medium">Date:</span> {{ formatDate(info.created_at) }}</p>
                      <p><span class="font-medium">PO:</span> {{ info.purchasingid }}</p>
                      <p><span class="font-medium">Unit:</span> {{ info.purchase_unit || 'N/A' }}</p>
                      <p><span class="font-medium">Received:</span> {{ info.completed_unit || 'N/A' }}</p>
                      <div v-if="info.loadingLogistic" class="text-blue-600">Loading...</div>
                      <div v-else-if="info.logisticInfo && info.logisticInfo.length > 0" class="mt-1">
                        <div v-for="(log, logIndex) in info.logisticInfo" :key="logIndex" 
                             class="bg-white rounded p-1 mb-1 shadow-sm">
                          <p><span class="font-medium" :class="{'text-green-500': log.completed_date}">Container:</span> {{ log.container_number || 'N/A' }}</p>
                          <p><span class="font-medium" :class="{'text-green-500': log.completed_date}">W.date:</span> {{ log.warehouse_date || 'N/A' }}</p>
                          <p><span class="font-medium" :class="{'text-green-500': log.completed_date}">ETA:</span> {{ log.received_date || 'N/A' }}</p>
                          <p><span class="font-medium" :class="{'text-green-500': log.completed_date}">Unit:</span> {{ log.unit || 'N/A' }}</p>
                        </div>
                      </div>
                      <div v-else class="text-gray-500">No logistic data</div>
                    </div>
                  </div>
                </div>
                <div v-else-if="item.additionalInfoError" class="mt-2 text-red-600 text-xs">
                  {{ item.additionalInfoError }}
                </div>
                <div v-else class="text-gray-400">No additional info</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <p v-else-if="itemInfo && itemInfo.length === 0" class="text-gray-500 text-center py-4">
        No results found for the selected category.
      </p>
    </div>
  </div>

  <div v-if="showXlsProgressDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
    <div class="bg-white p-5 rounded-lg shadow-xl max-w-lg w-full">
      <h3 class="text-lg font-semibold mb-4">XLS Import Results</h3>
      <p class="mb-2">Total items: {{ xlsResults.length }}</p>
      <p class="mb-4">Successfully imported: {{ successfulImports }}</p>
      <div class="max-h-60 overflow-x-auto mb-4">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50 sticky top-0">
            <tr>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Item Name</th>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">IQ</th>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">SQ</th>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r">Balance</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="result in successfulResults" :key="result.name" class="text-sm">
              <td class="px-3 py-2 whitespace-nowrap border-r">{{ result.name }}</td>
              <td class="px-3 py-2 whitespace-nowrap border-r">{{ result.iq }}</td>
              <td class="px-3 py-2 whitespace-nowrap border-r">{{ result.sq }}</td>
              <td class="px-3 py-2 whitespace-nowrap border-r">{{ result.balance }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <button @click="showXlsProgressDialog = false" class="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Close</button>
    </div>
  </div>

  <div v-if="showHistoryDialog" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
    <div class="bg-white p-5 rounded-lg shadow-xl max-w-lg w-full">
      <h3 class="text-lg font-semibold mb-4">Remark History</h3>
      <div v-if="loadingHistory" class="text-center py-4">
        <p class="text-gray-600">Loading history...</p>
      </div>
      <div v-else-if="historyData" class="mb-4 max-h-60 overflow-y-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50 sticky top-0">
            <tr>
              <th scope="col" class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Old Remark</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="(remark, index) in historyData" :key="index" class="text-sm">
              <td class="px-3 py-2 whitespace-pre-wrap">{{ remark }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="mb-4">
        <p class="text-sm text-gray-700">No history available.</p>
      </div>
      <button @click="showHistoryDialog = false" class="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Close</button>
    </div>
  </div>

  <div v-if="error" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
    <div class="bg-white p-5 rounded-lg shadow-xl max-w-lg w-full">
      <h3 class="text-lg font-semibold mb-4 text-red-600">Error</h3>
      <p class="mb-4 text-gray-700">{{ error }}</p>
      <div class="flex justify-end">
        <button @click="error = null" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Close</button>
      </div>
    </div>
  </div>

  <div v-if="showResetConfirmation" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
    <div class="bg-white p-5 rounded-lg shadow-xl max-w-lg w-full">
      <h3 class="text-lg font-semibold mb-4 text-red-600">Confirm Reset</h3>
      <p class="mb-4 text-gray-700">Are you sure you want to reset all category's Balance, SO, IQ, and SQ to 0? This action cannot be undone.</p>
      <div class="flex justify-end space-x-4">
        <button @click="showResetConfirmation = false" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancel</button>
        <button @click="performResetAll" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Confirm Reset</button>
      </div>
    </div>
  </div>

  <div v-if="showDelistConfirmation" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
    <div class="bg-white p-5 rounded-lg shadow-xl max-w-lg w-full">
      <h3 class="text-lg font-semibold mb-4 text-red-600">Confirm Delist</h3>
      <p class="mb-4 text-gray-700">Are you sure you want to delist this item? This action cannot be undone.</p>
      <div class="flex justify-end space-x-4">
        <button @click="showDelistConfirmation = false; itemToDelete = null" class="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400">Cancel</button>
        <button @click="performDelist" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">Confirm Delist</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useCategoryService } from '~/composables/useCategoryService'

const fileInput = ref(null)
const {
  categories,
  selectedCategory,
  loading,
  error,
  itemInfo,
  xlsResults,
  showXlsProgressDialog,
  successfulImports,
  showHistoryDialog,
  loadingHistory,
  historyData,
  showResetConfirmation,
  showDelistConfirmation,
  itemToDelete,
  itemSearchQuery,
  mainDates,
  
  successfulResults,
  filteredItems,
  
  fetchCategories,
  handleSearch,
  updateBalance,
  updateSO,
  updateIQ,
  updateSQ,
  updateExtraRemark,
  updateItemRemark,
  moveToHistory,
  showHistory,
  performResetAll,
  performDelist,
  handleFileUpload,
} = useCategoryService()

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return dateString.substring(0, 10)
}

const confirmDelist = (item) => {
  itemToDelete.value = item
  showDelistConfirmation.value = true
}

const onFileUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    handleFileUpload(file)
  }
  event.target.value = ''
}

onMounted(() => {
  fetchCategories()
})
</script>