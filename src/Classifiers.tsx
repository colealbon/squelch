import {
  For,
  createEffect,
} from 'solid-js';
import { compress } from 'compress-json'
import {
  Collapsible,
  Link
} from "@kobalte/core";
import {
  useParams
} from "@solidjs/router";

import {
  createFormGroup,
  createFormControl,
} from "solid-forms";
import { TextInput } from './components/TextInput'

import {
  VsCopy
} from 'solid-icons/vs'

import { PageHeader } from './components/PageHeader'
import { Button } from './components/Button'

const Classifiers = (props: {
  classifiers: Classifier[],
  // eslint-disable-next-line no-unused-vars
  putClassifier: (classifier: Classifier) => void,
  // eslint-disable-next-line no-unused-vars
  removeClassifier: (classifier: Classifier) => void
}) => {

  const group = createFormGroup({
    id: createFormControl(""),
    model: createFormControl(""),
    thresholdSuppressOdds: createFormControl('')
  });

  const onSubmit = async (event: Event) => {
    event.preventDefault()
    if (group.isSubmitted) {
      // console.log('already submitted')
      return;
    }
    [Object.fromEntries(
      Object.entries(Object.assign({
        id:'',
        model:'',
        thresholdSuppressOdds: ''
      }, group.value))
      .filter(([, value]) => `${value}` !== '')
    )]
    .forEach(newClassifier => {
      const newClassifierObj: Classifier = {
        ...{
          id: '',
          model: '',
          thresholdSuppressOdds: ''
        },
        ...newClassifier
      }
      props.putClassifier(newClassifierObj)
    })

    group.setValue({
      id:'',
      model:'',
      thresholdSuppressOdds: ''
    })
  };

  const handleAddClick = (event: Event) => {
    event.preventDefault()
    onSubmit(event)
    group.setValue({
      id:'',
      model: '',
      thresholdSuppressOdds: ''
    })
  }

  const handleKeyClick = (id: string) => {
    const valuesForSelectedClassifier = props.classifiers
      .find(classifierEdit => classifierEdit['id'] === id)
    const newClassifier: any = {
      id: `${valuesForSelectedClassifier?.id}`,
      model: `${valuesForSelectedClassifier?.model}`,
      thresholdSuppressOdds: `${valuesForSelectedClassifier?.thresholdSuppressOdds}`
    }
    group.setValue(newClassifier)
  }

  const handleCopyClick = () => {
    navigator.clipboard.writeText(group.controls.model.rawValue);
  }

  const handleRemoveClick = (classifier: any) => {
    props.removeClassifier(classifier)
  }

  createEffect(() => {
    if (useParams().trainLabel == null) {
      return
    } 
    const valuesForSelectedClassifier = props.classifiers
    .find(classifierEdit => classifierEdit['id'] === useParams().trainLabel)
    const newClassifier: any = {
      id: `${valuesForSelectedClassifier?.id}`,
      model: `${valuesForSelectedClassifier?.model}`,
      thresholdSuppressOdds: `${valuesForSelectedClassifier?.thresholdSuppressOdds}`
    }
    group.setValue(newClassifier)
    // try {
    //   if (`${useParams().trainlabel}` === 'undefined') {
    //     props.setSelectedTrainLabel('')
    //     return
    //   }
    //   props.setSelectedTrainLabel(`${useParams().trainlabel}`)
    // } catch (error) {
    //   console.log(error)
    //   return
    // }
  })
  return (
  <div class='fade-in'>
    <PageHeader>Edit Classifiers</PageHeader>
    <form onSubmit={onSubmit}>
      <label for="id">label</label>
      <TextInput name="id" control={group.controls.id} />
      <div />
      <label for="thresholdSuppressOdds">Threshold Suppress Odds</label>
      <TextInput name="thresholdSuppressOdds" control={group.controls.thresholdSuppressOdds} />
      <div />
      <label for="Model">Bayes Model</label>
      <TextInput name="model" control={group.controls.model} />
      <Button
        onClick={() => handleAddClick}
        label='SUBMIT'
      />
    </form>
    <Collapsible.Root class="collapsible border-none bg-transparent" defaultOpen={false}>
    <Collapsible.Trigger class="collapsible__trigger hover-bg-slate-900 hover-text-white bg-transparent border-none">
      <div class='hover-bg-slate-900 hover-text-white bg-transparent border-none'>copy JSON</div>
    </Collapsible.Trigger>
    <Collapsible.Content class="collapsible__content">
      <p class="collapsible__content-text">
      {<>
        <Button
          onClick={handleCopyClick}
          label={<VsCopy />}
        />
      <div style={{'max-width': '500px'}}>
        <pre>{JSON.stringify(group.controls.model.rawValue, null, 2)}</pre>
      </div>
      <div style={{'max-width': '500px'}}>
        <Link.Root 
          href={`/rssposts/${group.controls.id.value}?model=${btoa(encodeURIComponent(JSON.stringify(compress(JSON.parse(group.controls.model.rawValue)))))}`}
        >
          {`/rssposts/${group.controls.id.value}?model=${btoa(encodeURIComponent(JSON.stringify(compress(JSON.parse(group.controls.model.rawValue)))))}`}
        </Link.Root>
      </div>
    </>}
    </p>
    </Collapsible.Content>
    </Collapsible.Root>
    <h4 class="text-muted">Classifiers</h4>
  <div class='h-50 overflow-y-auto'>
  
  <For each={props.classifiers}>
    {(classifier) => (
      <div style={{
        'width': '100%',
        'display': 'flex',
        'flex-direction': 'row',
        'justify-content': 'flex-start',
        'font-size': '25px',
      }}>
        <div style={
          {
            'padding': '8px 8px 8px 32px',
            'text-decoration': 'none',
            'font-size': '25px',
            'color': '#818181',
            'display': 'block',
            'transition':'0.3s'
          }}>
        <Button 
          onClick={() => handleRemoveClick(classifier)}
          label='✕'
        />
        </div>
        <div style={
        {
          'padding': '8px 8px 8px 32px',
          'text-decoration': 'none',
          'font-size': '25px',
          'color': '#818181',
          'display': 'block',
          'transition':'0.3s'
        }}>
          <Button
            onClick={() => handleKeyClick(classifier.id)}
            label={classifier.id || ''}
          />
        </div>
      </div>
    )}
  </For>
  </div>
  </div>
  )
}

export interface Classifier {
  "id": string,
  "thresholdSuppressOdds"?: string
  "model": string
}

export default Classifiers;
