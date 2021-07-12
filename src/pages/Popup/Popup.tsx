import './Popup.css';

import React, { useEffect, useState } from 'react';

import ButtonPrimary from '../../components/ButtonPrimary';
import { getUserStatus, manageSubscription } from '../../modules/helpers';

function Popup() {
  const [version, setVersion] = useState('Initial version');
  const [isPro, setIsPro] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState('canceled');

  useEffect(() => {
    fillUserStatus();
    const manifestData = chrome.runtime.getManifest();

    setVersion(manifestData.version);

    async function fillUserStatus() {
      const [pro, status] = await getUserStatus();

      setIsPro(pro);
      setSubscriptionStatus(status);
    }
  }, [version]);

  async function handleManageSubscription() {
    manageSubscription();
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Wattpad to kindle E-reader</h1>
        <h2> v{version} </h2>

        {isPro && subscriptionStatus === 'active' && (
          // eslint-disable-next-line react/button-has-type
          <ButtonPrimary
            callback={handleManageSubscription}
            text="Manage Subscription"
            width={200}
          />
        )}

        {!isPro && subscriptionStatus === 'past_due' && (
          // eslint-disable-next-line react/button-has-type
          <ButtonPrimary
            callback={handleManageSubscription}
            text="Renew your plan 🌟"
            width={200}
          />
        )}

        {!isPro && subscriptionStatus !== 'past_due' && (
          // eslint-disable-next-line react/button-has-type
          <ButtonPrimary
            callback={handleManageSubscription}
            text="🌟 Be Pro 🌟"
            width={200}
          />
        )}
      </header>
    </div>
  );
}

export default Popup;
