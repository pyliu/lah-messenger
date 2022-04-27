<template lang="pug">
div
  vue-infinite-autocomplete(
    :data-source="toUsersOpts",
    :value="selected",
    @select="handleOnSelect"
  )
  //- b-input-group(
  //-   size="sm",
  //-   prepend="傳給",
  //-   @input="handleInput"
  //- )
  //-   b-input(
  //-     v-model="toUser",
  //-     :disabled="toMe"
  //-   )
  //-   b-checkbox.my-auto.ml-1(v-model="toMe") 給我自己
</template>

<script>
import VueInfiniteAutocomplete from 'vue-infinite-autocomplete'
export default {
  name: 'UserSelect',
  emit: ['input'],
  components: { VueInfiniteAutocomplete },
  props: ['value'],
  data: () => ({
    // toMe: false,
    selected: ''
  }),
  async fetch () {},
  computed: {
    toUsersOpts () {
      const opts = [
        ...this.$utils.orderBy(
          this.$utils.uniqBy(this.connectedUsers.map((user) => {
            return { id: user.userid, text: `${user.userid} ${user.username}`}
          }), 'id'),
          'id'
        )
      ]

      const found = opts.find(opt => {
        return opt.id === this.toUser
      })
      !found && this.userMap[this.toUser] && opts.unshift({ id: this.toUser, text: `${this.toUser} ${this.userMap[this.toUser]}` })
      return opts
    }
  },
  watch: {
    toMe (flag) {
      flag && (this.toUser = this.userid)
    },
    selected (val) {
      this.$emit('input', val.id)
    }
  },
  created () {
    // to refresh toUsersOpts
    this.queryChatChannelOnlineClients()
  },
  methods: {
    handleOnSelect(selectedValue) {
      this.selected = selectedValue
    }
  }
}
</script>

<style lang="scss" scoped>
</style>
