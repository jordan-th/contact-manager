let contactManager;

(function () {
  contactManager = {
    allContacts: [],
    visibleContacts: [],
    searchStr: '',
    selectedTags: [],
    contactsTemplate: null,
    
    createTemplate: function () {
      Handlebars.registerPartial('indivContact', $('#indivContact').html());
      this.contactsTemplate = Handlebars.compile($('#contacts').html());
    },

    getContacts: function () {
      $.ajax(
        this.createConfig('/api/contacts', 'get', null)
      ).done(function (response) {
        this.decomposeResponse(response);
        this.renderPage();
        this.addEventListeners();
      })
    },

    createConfig: function (action, method, data) {
      return {
        url: `${action}`,
        method: `${method}`,
        context: this,
        data: data
      }
    },

    decomposeResponse: function (response) {
      this.allContacts = response.map(contact => {
        if (typeof contact.tags === 'string') {
          contact.tags = contact.tags.split(',')
        } else if (!contact.tags) {
          contact.tags = [];
        }
        return contact;
      });
      this.visibleContacts = this.allContacts;
    },
 
    renderPage: function () {
      $('section > ul').html(this.contactsTemplate({ contacts: this.visibleContacts }));
      $('a.edit').on('click', $.proxy(this.editCallback, this));
      $('a.delete').on('click', $.proxy(this.deleteCallback, this));
    },

    addEventListeners: function () {
      $('#searchbar').on('input', $.proxy(this.searchEventCallback, this));
      $('#tag_options input').on('input', $.proxy(this.tagEventCallback, this));
      $('#new').on('click', $.proxy(this.newContactCallback, this));
      $('a.edit').on('click', $.proxy(this.editCallback, this));
      $('a.delete').on('click', $.proxy(this.deleteCallback, this));
    },

    searchEventCallback: function (e) {
      this.searchStr = '^' + e.target.value;
      this.filterContacts();
      this.renderPage();
    },

    tagEventCallback: function (e) {
      this.selectedTags = Array.prototype.map.call($('#tag_options :checked'), tagObj => $(tagObj).val());
      this.filterContacts();
      this.renderPage();
    },

    newContactCallback: function (e) {
      e.preventDefault()
      let $form = $('form');
      this.prepareForm("/api/contacts", "post")
      $form.show();
    },

    editCallback: function (e) {
      e.preventDefault();

      let id = $(e.target).closest('li').attr('data-id');
      let contactData = this.allContacts.filter(obj => obj.id == id)[0];

      this.prepareForm(`/api/contacts/${id}`, 'put');
      this.populateForm(contactData);
    },

    deleteCallback: function (e) {
      e.preventDefault();

      let id = $(e.target).closest('li').attr('data-id');

      if(confirm('Are you sure you would like to delete a contact?')) {
        $.ajax(
            this.createConfig(`/api/contacts/${id}`, 'delete', null)
          ).done(function () {
            this.getContacts();
            this.renderPage();
          })
      }
    },

    cancelCallback: function (e) {
      e.preventDefault();
      $('form').hide();
    },

    formSubmitCallback: function (e) {
      e.preventDefault();

      $.ajax(
        this.createConfig(
          $(e.target).attr('action'),
          $(e.target).attr('method'),
          this.serializeForm($(e.target).serializeArray())
        )
      ).done(function () {
        $('form').hide();
        this.getContacts();
        this.renderPage();
      })
    },

    filterContacts: function () {    
      this.visibleContacts = this.allContacts.filter(contact => {
        let searchRegEx = new RegExp(this.searchStr, "gi");
        let firstName = contact.full_name.split(" ")[0];
        let lastName = contact.full_name.split(" ")[1] || '';
        
        if (this.searchStr === '' && this.selectedTags.length === 0) {
          return true;
        } else if (this.searchStr !== '' && this.selectedTags.length === 0) {
          return firstName.match(searchRegEx) || lastName.match(searchRegEx);
        } else if (this.searchStr === '' && this.selectedTags.length !== 0) {
          return contact.tags.some(t => this.selectedTags.includes(t));
        } else {
          return (
            (firstName.match(searchRegEx) || lastName.match(searchRegEx)) &&
            contact.tags.some(t => this.selectedTags.includes(t))
          );
        }
      })
    },

    prepareForm: function(action, method) {
      let $form = $('form');
      let $cancel = $('button')
      
      $form.trigger('reset');
      $('form input:checkbox').removeAttr('checked');
      $form.attr('action', `${action}`);
      $form.attr('method', `${method}`);
      $form.off();
      $form.on('submit', $.proxy(this.formSubmitCallback, this))
      $cancel.on('click', $.proxy(this.cancelCallback, this));
      $form.show();
    },

    populateForm: function(contact) {
      Object.keys(contact).forEach(name => {
        
        if (name === 'tags') {
          let tagsArray = contact[name];
          tagsArray.forEach(tag => {
            $(`input[value=${tag}]`).attr('checked', true);
          })

        } else {
          let value = contact[name] || '';
          $('form').find(`input[name=${name}]`).val(`${value}`);
        }
      })
    },

    serializeForm: function (formArr) {
      let serialized = {tags: []};

      formArr.forEach(inputObj => {
        if (inputObj.name !== 'tag') {
          serialized[inputObj.name] = inputObj.value;
        } else if (inputObj.name === 'tag') {
          serialized.tags.push(inputObj.value)
        }
      });
      serialized.tags.join(',');

      return serialized;
    },

    init: function () {
      this.createTemplate();
      this.getContacts();
    }
  }
})();

$($.proxy(contactManager.init, contactManager));