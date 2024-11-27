import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'

export function useCategoryService() {
  const categories = ref([])
  const selectedCategory = ref('')
  const loading = ref(false)
  const error = ref(null)
  const itemInfo = ref(null)
  const xlsResults = ref([])
  const showXlsProgressDialog = ref(false)
  const successfulImports = ref(0)
  const importCompleted = ref(false)
  const showHistoryDialog = ref(false)
  const loadingHistory = ref(false)
  const historyData = ref(null)
  const showResetConfirmation = ref(false)
  const showDelistConfirmation = ref(false)
  const itemToDelete = ref(null)
  const itemSearchQuery = ref('')
  const mainDates = ref({
    from_date: '',
    to_date: '',
    updated_at: ''
  })

  const successfulResults = computed(() => {
    return xlsResults.value.filter(result => result.status === '1')
  })

  const filteredItems = computed(() => {
    if (!itemSearchQuery.value || !itemInfo.value) {
      return itemInfo.value
    }
    const query = itemSearchQuery.value.toLowerCase()
    return itemInfo.value.filter(item => 
      (item.name && item.name.toLowerCase().includes(query)) ||
      (item.item_id && item.item_id.toString().toLowerCase().includes(query))
    )
  })

  const updateMainDates = async (fromDate: string, toDate: string) => {
    try {
      const response = await fetch('https://mdotservice.com/mdot/service_info/index.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: `update_main_date=&from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}`,
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.status === '1') {
        await fetchMainDates()
      }
    } catch (err) {
      console.error('Error updating main dates:', err)
      throw err
    }
  }

  const fetchMainDates = async () => {
    try {
      const response = await fetch('https://mdotservice.com/mdot/service_info/index.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: 'get_main_date=',
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.status === '1' && data.data) {
        mainDates.value = {
          from_date: data.data[0].from_date || '',
          to_date: data.data[0].to_date || '',
          updated_at: data.data[0].updated_at || ''
        }
      }
    } catch (err) {
      console.error('Error fetching main dates:', err)
    }
  }

  const fetchCategories = async () => {
    loading.value = true
    error.value = null
    try {
      await fetchMainDates()
      const response = await fetch('https://mdotservice.com/mdot/service_info/index.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: 'category=',
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.status === '1' && data.category) {
        categories.value = data.category.map(item => ({
          name: item.name,
        }))
      } else {
        throw new Error('Invalid data format')
      }
    } catch (err) {
      console.error('Error fetching categories:', err)
      error.value = `Failed to load categories. Please check your internet connection and try again.`
    } finally {
      loading.value = false
    }
  }

  const handleSearch = async () => {
    if (!selectedCategory.value) return

    loading.value = true
    error.value = null
    itemInfo.value = null
    itemSearchQuery.value = ''

    try {
      const response = await fetch('https://mdotservice.com/mdot/service_info/index.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: `item_code=${encodeURIComponent(selectedCategory.value)}`,
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.status === '1' && data.item) {
        itemInfo.value = Array.isArray(data.item) ? data.item : [data.item]
        itemInfo.value.forEach(item => {
          item.loadingAdditionalInfo = false
          item.additionalInfo = null
          item.additionalInfoError = null
        })
        await Promise.all(itemInfo.value.map(fetchAdditionalInfo))
      } else {
        itemInfo.value = []
      }
    } catch (err) {
      console.error('Error fetching item info:', err)
      error.value = `Failed to load item information. ${err.message}`
    } finally {
      loading.value = false
    }
  }

  const fetchLogisticInfo = async (info, itemId) => {
    info.loadingLogistic = true
    try {
      const response = await fetch('https://mdotservice.com/mdot/service_info/index.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: `logistic_list=0&purchasingid=${encodeURIComponent(info.purchasingid)}&itemid=${encodeURIComponent(itemId)}`,
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.status === '1' && data.item) {
        info.logisticInfo = Array.isArray(data.item) ? data.item : [data.item]
        
        const totalCompletedUnits = info.logisticInfo.reduce((sum, logistic) => {
          if (logistic.completed_date && logistic.unit) {
            return sum + parseFloat(logistic.unit)
          }
          return sum
        }, 0)

        if (info.purchase_unit && totalCompletedUnits === parseFloat(info.purchase_unit)) {
          info.hidden = true
        }
      } else {
        info.logisticInfo = null
      }
    } catch (err) {
      console.error('Error fetching logistic info:', err)
      info.logisticInfo = null
    } finally {
      info.loadingLogistic = false
    }
  }

  const fetchAdditionalInfo = async (item) => {
    item.loadingAdditionalInfo = true
    item.additionalInfoError = null

    try {
      const response = await fetch('https://mdotservice.com/mdot/service_info/index.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: `list=${encodeURIComponent(item.item_id)}`,
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.status === '1' && data.item) {
        item.additionalInfo = Array.isArray(data.item) ? data.item : [data.item]
        for (const info of item.additionalInfo) {
          info.loadingLogistic = false
          info.logisticInfo = null
          info.hidden = false
          await fetchLogisticInfo(info, item.item_id)
        }
        item.additionalInfo = item.additionalInfo.filter(info => !info.hidden)
      } else {
        item.additionalInfo = null
      }
    } catch (err) {
      console.error('Error fetching additional info:', err)
      item.additionalInfoError = `Failed to load additional information. ${err.message}`
    } finally {
      item.loadingAdditionalInfo = false
    }
  }

  const updateBalance = async (item) => {
    try {
      const response = await fetch('https://mdotservice.com/mdot/service_info/index.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: `update_balance=&value=${encodeURIComponent(item.balance)}&item_id=${encodeURIComponent(item.item_id)}`,
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.status !== '1') {
        throw new Error('Failed to update balance')
      }
    } catch (err) {
      console.error('Error updating balance:', err)
      error.value = `Failed to update balance. ${err.message}`
    }
  }

  const updateSO = async (item) => {
    try {
      const response = await fetch('https://mdotservice.com/mdot/service_info/index.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: `update_so=&value=${encodeURIComponent(item.so)}&item_id=${encodeURIComponent(item.item_id)}`,
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.status !== '1') {
        throw new Error('Failed to update SO')
      }
    } catch (err) {
      console.error('Error updating SO:', err)
      error.value = `Failed to update SO. ${err.message}`
    }
  }

  const updateIQ = async (item) => {
    try {
      const response = await fetch('https://mdotservice.com/mdot/service_info/index.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: `update_iq=&value=${encodeURIComponent(item.iq)}&item_id=${encodeURIComponent(item.item_id)}`,
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.status !== '1') {
        throw new Error('Failed to update IQ')
      }
    } catch (err) {
      console.error('Error updating IQ:', err)
      error.value = `Failed to update IQ. ${err.message}`
    }
  }

  const updateSQ = async (item) => {
    try {
      const response = await fetch('https://mdotservice.com/mdot/service_info/index.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: `update_sq=&value=${encodeURIComponent(item.sq)}&item_id=${encodeURIComponent(item.item_id)}`,
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.status !== '1') {
        throw new Error('Failed to update SQ')
      }
    } catch (err) {
      console.error('Error updating SQ:', err)
      error.value = `Failed to update SQ. ${err.message}`
    }
  }

  const updateExtraRemark = async (item) => {
    try {
      const response = await fetch('https://mdotservice.com/mdot/service_info/index.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: `update_extra_remark=&value=${encodeURIComponent(item.extra_remark)}&item_id=${encodeURIComponent(item.item_id)}`,
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.status !== '1') {
        throw new Error('Failed to update Extra Remark')
      }
    } catch (err) {
      console.error('Error updating Extra Remark:', err)
      error.value = `Failed to update Extra Remark. ${err.message}`
    }
  }

  const updateItemRemark = async (item) => {
    try {
      const response = await fetch('https://mdotservice.com/mdot/service_info/index.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: `update_item_remark=&value=${encodeURIComponent(item.item_remark)}&item_id=${encodeURIComponent(item.item_id)}`,
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.status !== '1') {
        throw new Error('Failed to update item remark')
      }
    } catch (err) {
      console.error('Error updating item remark:', err)
      error.value = `Failed to update item remark. ${err.message}`
    }
  }

  const moveToHistory = async (item) => {
    if (!item.extra_remark || item.extra_remark.trim() === '') {
      error.value = "Cannot move an empty remark to history."
      return
    }

    try {
      const response = await fetch('https://mdotservice.com/mdot/service_info/index.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: `update_old_remark=&value=${encodeURIComponent(item.extra_remark)}&item_id=${encodeURIComponent(item.item_id)}`,
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if(data.status === '1') {
        item.extra_remark = ''
        await updateExtraRemark(item)
      } else {
        throw new Error('Failed to move Extra Remark to history')
      }
    } catch (err) {
      console.error('Error moving Extra Remark to history:', err)
      error.value = `Failed to move Extra Remark to history. ${err.message}`
    }
  }

  const showHistory = async (item) => {
    showHistoryDialog.value = true
    loadingHistory.value = true
    historyData.value = null

    try {
      const response = await fetch('https://mdotservice.com/mdot/service_info/index.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: `get_old_remark=&item_id=${encodeURIComponent(item.item_id)}`,
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.status === '1' && data.old_remark) {
        historyData.value = data.old_remark.split('\n').filter(remark => remark.trim() !== '')
      } else {
        historyData.value = []
      }
    } catch (err) {
      console.error('Error fetching history:', err)
      error.value = `Failed to load history. ${err.message}`
    } finally {
      loadingHistory.value = false
    }
  }

  const performResetAll = async () => {
    showResetConfirmation.value = false
    loading.value = true
    error.value = null

    try {
      const response = await fetch('https://mdotservice.com/mdot/service_info/index.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: 'reset_all_item=',
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.status === '1') {
        if (selectedCategory.value) {
          await handleSearch()
        }
      } else {
        throw new Error('Failed to reset all items')
      }
    } catch (err) {
      console.error('Error resetting all items:', err)
      error.value = `Failed to reset all items. ${err.message}`
    } finally {
      loading.value = false
    }
  }

  const performDelist = async () => {
    if (!itemToDelete.value) return

    showDelistConfirmation.value = false
    loading.value = true
    error.value = null

    try {
      const response = await fetch('https://mdotservice.com/mdot/service_info/index.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: `delist_item=&item_id=${encodeURIComponent(itemToDelete.value.item_id)}`,
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (data.status === '1') {
        itemInfo.value = itemInfo.value.filter(item => item.item_id !== itemToDelete.value.item_id)
      } else {
        throw new Error('Failed to delist item')
      }
    } catch (err) {
      console.error('Error delisting item:', err)
      error.value = `Failed to delist item. ${err.message}`
    } finally {
      loading.value = false
      itemToDelete.value = null
    }
  }

  const handleFileUpload = async (file) => {
    if (!file) return

    xlsResults.value = []
    successfulImports.value = 0
    showXlsProgressDialog.value = true
    importCompleted.value = false

    const reader = new FileReader()
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

      try {
       function excelDateToString(excelDate) {
    // Check if the value exists and is a number
    if (!excelDate) return '';
    
    // Excel's date system starts from 1900-01-01
    const utcDays = Math.floor(excelDate.v - 25569);
    const utcValue = utcDays * 86400 * 1000;
    const dateInfo = new Date(utcValue);

    // Format date as DD/MM/YYYY
    const day = dateInfo.getDate().toString().padStart(2, '0');
    const month = (dateInfo.getMonth() + 1).toString().padStart(2, '0');
    const year = dateInfo.getFullYear();
    
    return `${day}/${month}/${year}`;
}

// Usage with your worksheet
const fromDate = worksheet['E2'] ? excelDateToString(worksheet['E2']) : '';
const toDate = worksheet['G2'] ? excelDateToString(worksheet['G2']) : '';
 
        if (fromDate && toDate) {
          await updateMainDates(fromDate, toDate)
        }

        for (let i = 0; i < jsonData.length; i++) {
          const nameRow = jsonData[i]
          const dataRow = jsonData[i + 1] || []
          if (nameRow && nameRow[0]) {
            const name = nameRow[0].toString().trim()
            if (name) {
              try {
                const response = await fetch('https://mdotservice.com/mdot/service_info/index.php', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                  },
                  body: `get_item_id=&name=${encodeURIComponent(name)}`,
                })
                if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`)
                }
                const data = await response.json()
                if (data.status === '1' && data.item_id) {
                  const iq = dataRow[1] !== undefined ? dataRow[1].toString() : '0'
                  const sq = dataRow[2] !== undefined ? dataRow[2].toString() : '0'
                  const balance = dataRow[3] !== undefined ? dataRow[3].toString() : '0'

                  const updateResponse = await fetch('https://mdotservice.com/mdot/service_info/index.php', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/x-www-form-urlencoded',
                      'Accept': 'application/json',
                    },
                    body: `update_item_detail=&balance=${encodeURIComponent(balance)}&iq=${encodeURIComponent(iq)}&sq=${encodeURIComponent(sq)}&item_id=${encodeURIComponent(data.item_id)}`,
                  })

                  if (!updateResponse.ok) {
                    throw new Error(`HTTP error! status: ${updateResponse.status}`)
                  }

                  const updateData = await updateResponse.json()
                  if (updateData.status === '1') {
                    successfulImports.value++
                    xlsResults.value.push({ name, status: '1', iq, sq, balance })
                  }
                }
              } catch (err) {
                console.error('Error processing XLS row:', err)
              }
            }
          }
        }
      } catch (err) {
        console.error('Error processing XLS file:', err)
        error.value = `Failed to process XLS file. ${err.message}`
      }

      importCompleted.value = true
    }
    reader.readAsArrayBuffer(file)
  }

  return {
    categories,
    selectedCategory,
    loading,
    error,
    itemInfo,
    xlsResults,
    showXlsProgressDialog,
    successfulImports,
    importCompleted,
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
  }
}