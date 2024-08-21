import chloride from 'chloride'
import {
  For
} from 'solid-js';
import {
  createFormGroup,
  createFormControl,
} from "solid-forms";
import { TextInput } from './components/TextInput'
import { Link } from "@kobalte/core";
import {
  VsAdd
} from 'solid-icons/vs'
import { CgErase } from 'solid-icons/cg'
import { PageHeader } from './components/PageHeader'
import { Button } from './components/Button'

const keypair = chloride.crypto_box_keypair

const EncryptionKeys = (props: {
  encryptionKeys: EncryptionKey[],
  // eslint-disable-next-line no-unused-vars
  putEncryptionKey: (newKey: EncryptionKey) => void,
  // eslint-disable-next-line no-unused-vars
  removeEncryptionKey: (newKey: EncryptionKey) => void
}) => {
  const group = createFormGroup({
    publicKey: createFormControl(""),
    secretKey: createFormControl(""),
    label: createFormControl("")
  });

  const onSubmit = async (event: any) => {
    event.preventDefault()
    if (group.isSubmitted) {
      console.log('already submitted')
      return;
    }
    const submitted = Object.fromEntries(
      Object.entries(Object.assign({
        publicKey:'',
        secretKey:'',
        label:''
      }, group?.value)).filter(([, value]) => `${value}` !== '')
    )
    let newKey = Object.assign(submitted)
    if (`${newKey.publicKey}${newKey.secretKey}` == 'undefinedundefined') {
      const newKeyPair = await keypair()
      newKey.secretKey = newKeyPair.secretKey.toString('hex')
      newKey.publicKey = newKeyPair.publicKey.toString('hex')
    }
    props.putEncryptionKey(newKey)
    group.setValue({
      publicKey:'',
      secretKey:'',
      label:''
    })
  };
  const handleEncryptionKeyClick = (publicKey: string) => {
    const valuesForSelectedKey = props.encryptionKeys
      .find(encryptionKeyEdit => encryptionKeyEdit['publicKey'] === publicKey)
    group.setValue(Object.assign({
        publicKey:'',
        secretKey:'',
        label:''
      }, valuesForSelectedKey))
  }

  const handleEraseClick = () => {
    group.setValue({
        publicKey:'',
        secretKey:'',
        label:''
    })
  }

  return (
  <div class='fade-in'>
    <PageHeader>Encryption Keys</PageHeader>
    <div>
      <form onSubmit={onSubmit}>
        <label for="publicEncryptionKey">Public Key</label>
        <TextInput name="publicEncryptiohKey" control={group.controls.publicKey} />
        <label for="secretEncryptionKey">Secret Key</label>
        <TextInput name="secretEncryptionKey" control={group.controls.secretKey} />
        <div color='orange'>(Not secure - do not paste sensitive keys)</div>
        <label for="label">Label</label>
        <TextInput name="label" control={group.controls.label} />
        <div class='flex flex-row'>
          <div>
            <Button onClick={() => false} label={<VsAdd />}/>
          </div>
          <div >
            <Link.Root onClick={(event: Event) => {
              event.preventDefault()
              handleEraseClick()
            }}>
              <CgErase />
            </Link.Root>
          </div>
        </div>
      </form>
      <h4 class="text-muted">Keys</h4>
      <div class='h-50 overflow-y-auto'>
        <For each={props.encryptionKeys}>
          {(encryptionKey) => (
            <div style={
              {
                'width': '100%',
                'display': 'flex',
                'flex-direction': 'row',
                'justify-content': 'flex-start',
                'font-size': '25px',
              }
            }>
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
                  onClick={() => props.removeEncryptionKey(encryptionKey)}
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
                  onClick={() => handleEncryptionKeyClick(encryptionKey.publicKey)}
                  label={encryptionKey.label || encryptionKey.publicKey}
                />
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
    </div>
  )
}
export default EncryptionKeys;
export interface EncryptionKey {
  publicKey: string;
  secretKey?: string;
  label?: string;
}