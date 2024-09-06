const BaseXform = require('./base-xform');

class ListXform extends BaseXform {
  constructor(options) {
    super();

    this.tag = options.tag;
    this.always = !!options.always;
    this.count = options.count;
    this.empty = options.empty;
    this.$count = options.$count || 'count';
    this.$ = options.$;
    this.childXform = options.childXform;
    this.maxItems = options.maxItems;
  }

  prepare(model, options) {
    const {childXform} = this;
    if (model) {
      model.forEach((childModel, index) => {
        options.index = index;
        childXform.prepare(childModel, options);
      });
    }
  }

  render(xmlStream, model, passthroughXForms) {
    if (this.always || (model && model.length) || (passthroughXForms && passthroughXForms.length)) {
      xmlStream.openNode(this.tag, this.$);
      if (this.count) {
        let count = (model && model.length) || 0;
        if (passthroughXForms) {
          count += passthroughXForms.length;
        }
        xmlStream.addAttribute(this.$count, count);
      }

      const {childXform} = this;
      (model || []).forEach((childModel, index) => {
        childXform.render(xmlStream, childModel, index);
      });

      // Pass through XForms are used to pass print areas through exceljs without actually handling them in any way
      // This is a bit of a hack, but it's the easiest way to get the print areas to persist through the xlsx round-trip
      (passthroughXForms || []).forEach((passthroughXForm) => {
        childXform.render(xmlStream, passthroughXForm);
      });

      xmlStream.closeNode();
    } else if (this.empty) {
      xmlStream.leafNode(this.tag);
    }
  }

  parseOpen(node) {
    if (this.parser) {
      this.parser.parseOpen(node);
      return true;
    }
    switch (node.name) {
      case this.tag:
        this.model = [];
        return true;
      default:
        if (this.childXform.parseOpen(node)) {
          this.parser = this.childXform;
          return true;
        }
        return false;
    }
  }

  parseText(text) {
    if (this.parser) {
      this.parser.parseText(text);
    }
  }

  parseClose(name) {
    if (this.parser) {
      if (!this.parser.parseClose(name)) {
        this.model.push(this.parser.model);
        this.parser = undefined;

        if (this.maxItems && this.model.length > this.maxItems) {
          throw new Error(`Max ${this.childXform.tag} count (${this.maxItems}) exceeded`);
        }
      }
      return true;
    }

    return false;
  }

  reconcile(model, options) {
    if (model) {
      const {childXform} = this;
      model.forEach(childModel => {
        childXform.reconcile(childModel, options);
      });
    }
  }
}

module.exports = ListXform;
