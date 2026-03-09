import logo from "../Styles/lungsod-logo-white.png";
import Styles from "./loader.scss";

export const Loader = () => {
  return (
    <div className={Styles.loaderUi}>
      <img src={logo} alt="Lungsod" />
    </div>
  );
};
