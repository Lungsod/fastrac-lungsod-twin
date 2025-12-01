declare namespace GlobalScssNamespace {
  export interface IGlobalScss {
    rcSliderTooltipZoomDownIn: string;
    rcSliderTooltipZoomDownOut: string;
    "react-datepicker__month--selecting-range": string;
    "react-datepicker__year--selecting-range": string;
    reactDatepickerMonthSelectingRange: string;
    reactDatepickerYearSelectingRange: string;
    "tjs-_base__scrollbars": string;
    tjsBaseScrollbars: string;
  }
}

declare const GlobalScssModule: GlobalScssNamespace.IGlobalScss & {
  /** WARNING: Only available when `css-loader` is used without `style-loader` or `mini-css-extract-plugin` */
  locals: GlobalScssNamespace.IGlobalScss;
};

export = GlobalScssModule;
