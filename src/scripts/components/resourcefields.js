import { Formio } from 'ng-formio/lib/modules';
const NestedDataComponent = Formio.Components.components.nesteddata;
class ResourceFieldsComponent extends NestedDataComponent {
  constructor(component, options, data) {
    component.components = [
      {
        type: 'select',
        label: 'Save submission to',
        authenticate: true,
        valueProperty: '_id',
        template: '<span>{{ item.title }}</span>',
        searchField: 'title__regex',
        key: 'resource',
        dataSrc: 'url',
        lazyLoad: false,
        tooltip: 'Select the Resource to save submissions to.',
        onChange(context) {
          if (context.instance && context.instance.parent) {
            context.instance.parent.addDynamicFields();
          }
        },
        data: {
          url: `${Formio.getProjectUrl()}/form?type=resource&limit=4294967295&select=_id,title`
        }
      },
      {
        label: 'Resource Property',
        key: 'property',
        inputType: 'text',
        input: true,
        placeholder: 'Assign this resource to the following property',
        prefix: '',
        suffix: '',
        type: 'textfield',
        conditional: {
          json: { var: 'data.settings.resource' }
        }
      },
      {
        legend: 'Resource Fields',
        key: 'resourceFields',
        type: 'fieldset',
        components: [
          {
            type: 'well',
            components: [
              {
                type: 'content',
                html: 'Below are the fields within the selected resource. For each of these fields, select the corresponding field within this form that you wish to map to the selected Resource. <br /> Simple mappings may be used for any component that is not nested within a container, editgrid, datagrid or other nested data component.'
              }
            ]
          },
          {
            type: 'panel',
            title: 'Simple Mappings',
            key: 'dynamic',
            components: []
          },
          {
            type: 'panel',
            title: 'Transform Mappings',
            key: 'transformPanel',
            components: [
              {
                input: true,
                label: "Transform Data",
                key: "transform",
                placeholder: "/** Example Code **/\ndata = submission.data;",
                rows: 8,
                defaultValue: "",
                persistent: true,
                editor: "ace",
                type: "textarea",
                description: "Available variables are submission and data (data is already transformed by simple mappings)."
              }
            ]
          }
        ],
        conditional: {
          json: { var: 'data.settings.resource' }
        }
      }
    ];
    super(component, options, data);
  }

  addDynamicFields() {
    if (!this.data.resource) {
      return;
    }
    Formio.request(`${Formio.getProjectUrl()}/form/${this.data.resource}`).then((result) => {
      const dynamicFields = this.getComponent('dynamic');
      dynamicFields.destroyComponents();
      const formFields = [{
        value: 'data',
        label: 'Entire Submission Data',
      }];
      FormioUtils.eachComponent(this.options.currentForm.components, (component, path) => {
        if (component.type !== 'button' && path.indexOf('.') === -1) {
          formFields.push({
            value: component.key,
            label: `${component.label || component.title || component.legend} (${component.key})`
          });
        }
      });

      FormioUtils.eachComponent(result.components, (component, path) => {
        if (component.type !== 'button' && path.indexOf('.') === -1) {
          dynamicFields.addComponent({
            type: 'select',
            input: true,
            label: `${component.label} (${component.key})`,
            key: `fields.${component.key}`,
            dataSrc: 'values',
            data: {values: formFields},
            validate: {
              required: component.validate ? (component.validate.required) : false
            }
          }, this.data);
        }
      });
      dynamicFields.redraw();
    });
  }

  setValue(value, flags) {
    const changed = super.setValue(value, flags);
    this.addDynamicFields();
    return changed;
  }
}

Formio.registerComponent('resourcefields', ResourceFieldsComponent);
