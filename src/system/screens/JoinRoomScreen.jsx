import { useState } from 'react'
import { getNicknameError, getPassphraseError } from '../lib/validation.js'
import { useFormSubmit } from '../hooks/useFormSubmit.js'
import {
  FieldError,
  NicknameInput,
  PassphraseInput,
} from '../components/FormFields.jsx'

// ルーム参加画面（定員はルーム側の設定を使うので入力しない）
// onJoin({ nickname, passphrase }) が失敗したらエラーを表示する
function JoinRoomScreen({ onBack, onJoin }) {
  const [nickname, setNickname] = useState('')
  const [passphrase, setPassphrase] = useState('')
  const { submitted, submitting, serverError, submit } = useFormSubmit(onJoin)

  const nicknameError = getNicknameError(nickname)
  const passphraseError = getPassphraseError(passphrase)

  const handleSubmit = () =>
    submit(Boolean(nicknameError || passphraseError), {
      nickname,
      passphrase,
    })

  return (
    <div className="menu-screen">
      <h1>参加する</h1>

      <div className="form">
        <div className="form-row">
          <label htmlFor="join-nickname">ニックネーム</label>

          <NicknameInput
            id="join-nickname"
            value={nickname}
            onChange={setNickname}
            error={submitted || nickname ? nicknameError : ''}
          />
        </div>

        <div className="form-row">
          <label htmlFor="join-passphrase">合言葉</label>

          <PassphraseInput
            id="join-passphrase"
            value={passphrase}
            onChange={setPassphrase}
            error={submitted ? passphraseError : ''}
          />
        </div>

        <FieldError message={serverError} />

        <div className="menu-buttons">
          <button
            className="menu-button primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '参加中…' : '参加する'}
          </button>

          <button className="menu-button" onClick={onBack}>
            戻る
          </button>
        </div>
      </div>
    </div>
  )
}

export default JoinRoomScreen
