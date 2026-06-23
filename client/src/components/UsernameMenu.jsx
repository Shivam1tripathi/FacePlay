import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { changeUsername } from "../services/userApi.js";
import { storeUsername } from "../services/usernameGenerator.js";

export function UsernameMenu({ username, storageKey, onUsernameChange }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  const openModal = () => {
    setErrorMessage("");
    setMenuOpen(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (isChanging) {
      return;
    }

    setModalOpen(false);
    setErrorMessage("");
  };

  const handleConfirm = async () => {
    setIsChanging(true);
    setErrorMessage("");

    try {
      const user = await changeUsername({ username });
      storeUsername(storageKey, user.username);
      onUsernameChange(user.username);
      setModalOpen(false);
    } catch (error) {
      setErrorMessage(error.message || "Could not change username");
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <>
      <div className="username-menu" ref={menuRef}>
        <button
          type="button"
          className="username-menu-trigger user-chip"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="username-menu-label" key={username}>
            {username}
          </span>
          <ChevronDown
            size={16}
            className={menuOpen ? "username-menu-chevron is-open" : "username-menu-chevron"}
            aria-hidden="true"
          />
        </button>

        {menuOpen && (
          <div className="username-menu-dropdown" role="menu">
            <button
              type="button"
              className="username-menu-item"
              role="menuitem"
              onClick={openModal}
            >
              Change Username
            </button>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="username-modal-backdrop" onClick={closeModal}>
          <div
            className="username-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="username-change-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">Username</p>
            <h2 id="username-change-title">Change username?</h2>
            <p className="username-modal-copy">
              Are you sure? If you continue, your high score will be transferred to
              your new username.
            </p>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
            <div className="username-modal-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={closeModal}
                disabled={isChanging}
              >
                Cancel
              </button>
              <button
                type="button"
                className="username-modal-confirm"
                onClick={handleConfirm}
                disabled={isChanging}
              >
                {isChanging ? "Changing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
